import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// MCPクライアントの初期化（mcp-server.jsを子プロセスとして起動）
const mcpTransport = new StdioClientTransport({ command: "node", args: ["mcp-server.js"] });
const mcpClient = new Client({ name: "gemini-client", version: "1.0.0" }, { capabilities: {} });

async function initMCP() {
    await mcpClient.connect(mcpTransport);
}
initMCP();

function resolveErrorStatus(error) {
    if (typeof error?.status === 'number') return error.status;
    if (typeof error?.statusCode === 'number') return error.statusCode;
    if (typeof error?.cause?.status === 'number') return error.cause.status;
    if (typeof error?.cause?.statusCode === 'number') return error.cause.statusCode;
    return 500;
}

function resolveErrorMessage(error) {
    return error?.message || error?.cause?.message || 'Unknown error';
}

function tryParseJson(text) {
    if (typeof text !== 'string') return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error) {
    const status = resolveErrorStatus(error);
    const message = resolveErrorMessage(error).toLowerCase();
    return status === 429 || status === 503 || message.includes('high demand') || message.includes('try again later');
}

async function sendMessageWithRetry(chat, payload, options = {}) {
    const maxRetries = options.maxRetries ?? 3;
    const baseDelayMs = options.baseDelayMs ?? 800;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await chat.sendMessage(payload);
        } catch (error) {
            const canRetry = isRetryableGeminiError(error) && attempt < maxRetries;
            if (!canRetry) throw error;

            const waitMs = baseDelayMs * (2 ** attempt);
            console.warn(`[Gemini Retry] attempt=${attempt + 1}/${maxRetries + 1}, wait=${waitMs}ms`);
            await sleep(waitMs);
        }
    }
}

app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        const toolResultTexts = [];
        const callSignatureCount = new Map();

        console.log(`[Chat Request] ユーザーからのプロンプト: ${prompt}`);

        // 1. MCPサーバーから利用可能なツール一覧を取得
        const { tools: mcpTools } = await mcpClient.listTools();
        const availableToolNames = new Set(mcpTools.map((tool) => tool.name));

        console.log(`[MCP Tools] MCPサーバーから取得したツール:`, mcpTools.map(t => t.name));

        // 2. MCPのJSON Schemaを、Gemini APIのFunctionDeclaration形式に変換
        const geminiTools = [{
            functionDeclarations: mcpTools.map(tool => ({
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: "OBJECT",
                    properties: tool.inputSchema.properties,
                    required: tool.inputSchema.required
                }
            }))
        }];

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", tools: geminiTools });
        const chat = model.startChat();
        // 3. Geminiにプロンプトを送信
        let result = await sendMessageWithRetry(chat, prompt, { maxRetries: 3, baseDelayMs: 800 });
        console.log(`[Gemini Response] Geminiからの初回レスポンス:`, result.response.text());

        let response = result.response;
        console.log(`[Gemini Function Calls] 初回レスポンスに対する関数呼び出し要求:`, response.functionCalls());

        // 4. Geminiが関数呼び出しを返す限り、順次ツール実行して会話を継続
        const MAX_TOOL_ROUNDS = 5;
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const functionCalls = response.functionCalls() || [];
            if (functionCalls.length === 0) break;

            const signatures = functionCalls.map((call) => `${call.name}:${JSON.stringify(call.args || {})}`);
            const hasCycle = signatures.every((signature) => (callSignatureCount.get(signature) || 0) >= 1);
            if (hasCycle) {
                console.warn('[Function Calling] 同一の関数呼び出しが繰り返されたため、ループ防止で中断します。');
                break;
            }

            const functionResponses = [];
            for (let i = 0; i < functionCalls.length; i++) {
                const call = functionCalls[i];
                const signature = signatures[i];
                callSignatureCount.set(signature, (callSignatureCount.get(signature) || 0) + 1);

                console.log(`[Function Calling] Geminiが ${call.name} を要求しました。引数:`, call.args);

                if (!availableToolNames.has(call.name)) {
                    const unknownToolMessage = `Unknown tool requested by model: ${call.name}. Available tools: ${[...availableToolNames].join(', ')}`;
                    console.warn(`[Function Calling] ${unknownToolMessage}`);
                    functionResponses.push({
                        functionResponse: {
                            name: call.name,
                            response: { error: unknownToolMessage }
                        }
                    });
                    continue;
                }

                const toolResult = await mcpClient.callTool({
                    name: call.name,
                    arguments: call.args
                });
                const toolResultText = toolResult?.content?.[0]?.text ?? null;
                if (toolResultText) toolResultTexts.push(toolResultText);
                const parsedToolResult = tryParseJson(toolResultText);

                functionResponses.push({
                    functionResponse: {
                        name: call.name,
                        response: { result: parsedToolResult ?? toolResultText }
                    }
                });
            }

            result = await sendMessageWithRetry(chat, functionResponses, { maxRetries: 3, baseDelayMs: 800 });
            response = result.response;
        }

        // フロントエンドへ最終回答を返却
        const responseText = response.text();
        const fallbackText = toolResultTexts.length > 0
            ? `ツール実行結果: ${toolResultTexts.join(' | ')}`
            : null;
        res.json({ text: responseText || fallbackText || '回答テキストを生成できませんでした。' });

    } catch (error) {
        const status = resolveErrorStatus(error);
        const message = resolveErrorMessage(error);
        console.error('[API /api/chat ERROR]', {
            status,
            message,
            stack: error?.stack,
            cause: error?.cause
        });
        res.status(status).json({ error: message });
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));