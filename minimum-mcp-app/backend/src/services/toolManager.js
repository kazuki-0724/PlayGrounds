const fs = require('fs');
const path = require('path');

// ツール定義(JSON)を読み込んでGemini用にフォーマットする
function getToolDeclarations() {
    const toolsDir = path.join(__dirname, '../tools');
    const files = fs.readdirSync(toolsDir).filter(f => f.endsWith('.json'));
    const declarations = [];

    for (const file of files) {
        const raw = fs.readFileSync(path.join(toolsDir, file), 'utf-8');
        const parsed = JSON.parse(raw);

        // Gemini SDKは型の指定を大文字（STRING, OBJECTなど）で要求するため変換
        if (parsed.parameters && parsed.parameters.type) {
            parsed.parameters.type = parsed.parameters.type.toUpperCase();
            if (parsed.parameters.properties) {
                for (const key in parsed.parameters.properties) {
                    if (parsed.parameters.properties[key].type) {
                        parsed.parameters.properties[key].type = parsed.parameters.properties[key].type.toUpperCase();
                    }
                }
            }
        }
        declarations.push(parsed);
    }
    return declarations;
}

// 実際にツールを実行する（今回は外部APIではなくモックを返す）
async function executeTool(toolName, toolArgs) {
    console.log(`[Tool Executing] ${toolName}`, toolArgs);

    if (toolName === 'get_current_weather') {
        const loc = toolArgs.location || 'Unknown';
        // 気温を15〜30の間でランダムに生成
        const temp = Math.floor(Math.random() * 15) + 15;
        const conditions = ["Sunny", "Cloudy", "Rainy"];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];

        return {
            location: loc,
            temperature: temp,
            condition: condition,
            unit: "Celsius"
        };
    }

    if (toolName === 'search_zip_code') {
        const zipcode = toolArgs.zipcode;
        try {
            // 公開API (zipcloud) を呼び出し
            const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                return {
                    prefecture: result.address1, // 都道府県
                    city: result.address2,       // 市区町村
                    town: result.address3,       // 町域
                    kana: `${result.kana1} ${result.kana2} ${result.kana3}`
                };
            } else {
                return { error: '該当する住所が見つかりませんでした。郵便番号を確認してください。' };
            }
        } catch (error) {
            console.error("Zip API Error:", error);
            return { error: '外部APIとの通信中にエラーが発生しました。' };
        }
    }

    return { error: `Tool ${toolName} is not implemented.` };
}

module.exports = {
    getToolDeclarations,
    executeTool
};