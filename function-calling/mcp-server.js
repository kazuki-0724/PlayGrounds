import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// --- 1. 自作のAPI（ダミー） ---
const getEmployeeInfoAPI = (employeeId) => {
    const db = {
        "E001": { name: "山田太郎", department: "システム開発部" },
        "E002": { name: "佐藤花子", department: "インフラ推進部" }
    };
    return db[employeeId] || { error: "指定された社員IDは見つかりませんでした。" };
};

// --- 2. MCPサーバーの設定 ---
const server = new Server({ name: "my-custom-api", version: "1.0.0" }, { capabilities: { tools: {} } });

// ツールの定義（Geminiにこの仕様が伝わります）
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [{
        name: "get_employee_info",
        description: "社員IDから、その社員の名前と所属部署を取得します。",
        inputSchema: {
            type: "object",
            properties: {
                employeeId: { type: "string", description: "社員ID (例: E001)" }
            },
            required: ["employeeId"]
        }
    }]
}));

// ツールの実行ルーティング
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "get_employee_info") {
        const result = getEmployeeInfoAPI(request.params.arguments.employeeId);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }]
        };
    }
    throw new Error("Unknown tool");
});

// stdioトランスポートで起動
const transport = new StdioServerTransport();
server.connect(transport);