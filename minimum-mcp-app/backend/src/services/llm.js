const { GoogleGenerativeAI } = require('@google/generative-ai');
const toolManager = require('./toolManager');

async function processChat(apiKey, messages) {
    // 1. クライアントの初期化
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 2. ツール定義を取得してモデルに設定
    const tools = [{ functionDeclarations: toolManager.getToolDeclarations() }];
    const model = genAI.getGenerativeModel({
        model: 'gemini-3.5-flash',
        tools: tools
    });

    // フロントエンドのメッセージ配列をそのままcontentsとして扱う
    const contents = [...messages];
    const toolLogs = [];

    try {
        // 3. 一度目のリクエスト送信
        const result = await model.generateContent({ contents });
        const response = result.response;

        // 4. Geminiが「ツールを使いたい」と要求してきたか判定
        const functionCalls = response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0]; // 今回は最初の1つだけ処理
            
            // ツールの実行
            const toolResult = await toolManager.executeTool(call.name, call.args);
            
            // フロントに返す用のログを保存
            toolLogs.push({
                toolName: call.name,
                arguments: call.args,
                result: toolResult
            });

            // 5. 対話コンテキストに「Geminiのツール実行要求」と「ローカルでの実行結果」を追加
            contents.push(response.candidates[0].content); // モデルの呼び出し要求履歴
            contents.push({
                role: 'function',
                parts: [{
                    functionResponse: {
                        name: call.name,
                        response: toolResult
                    }
                }]
            });

            // 6. 実行結果を含めて再度リクエスト送信（最終的なテキスト回答を生成させる）
            const finalResult = await model.generateContent({ contents });
            return {
                reply: finalResult.response.candidates[0].content,
                toolLogs
            };
        }

        // ツール呼び出しが発生しなかった通常のテキスト応答の場合
        return {
            reply: response.candidates[0].content,
            toolLogs
        };

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}

module.exports = {
    processChat
};