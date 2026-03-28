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

app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        const toolResultTexts = [];

        // 1. MCPサーバーから利用可能なツール一覧を取得
        const { tools: mcpTools } = await mcpClient.listTools();

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

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", tools: geminiTools });
        const chat = model.startChat();

        // 3. Geminiにプロンプトを送信
        let result = await chat.sendMessage(prompt);
        let response = result.response;

        // 4. Geminiが関数呼び出しを返す限り、順次ツール実行して会話を継続
        const MAX_TOOL_ROUNDS = 5;
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const functionCalls = response.functionCalls() || [];
            if (functionCalls.length === 0) break;

            const functionResponses = [];
            for (const call of functionCalls) {
                console.log(`[Function Calling] Geminiが ${call.name} を要求しました。引数:`, call.args);

                const toolResult = await mcpClient.callTool({
                    name: call.name,
                    arguments: call.args
                });
                const toolResultText = toolResult?.content?.[0]?.text ?? null;
                if (toolResultText) toolResultTexts.push(toolResultText);

                functionResponses.push({
                    functionResponse: {
                        name: call.name,
                        response: { result: toolResultText }
                    }
                });
            }

            result = await chat.sendMessage(functionResponses);
            response = result.response;
        }

        // フロントエンドへ最終回答を返却
        const responseText = response.text();
        const fallbackText = toolResultTexts.length > 0
            ? `ツール実行結果: ${toolResultTexts.join(' | ')}`
            : null;
        res.json({ text: responseText || fallbackText || '回答テキストを生成できませんでした。' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));