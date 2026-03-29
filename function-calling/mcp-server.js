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

const RECIPE_ITEM_DB = {
    "G001": { id: "G001", name: "国産 玉ねぎ", unitPrice: 120, unit: "個", stock: 82 },
    "G002": { id: "G002", name: "北海道 じゃがいも", unitPrice: 80, unit: "個", stock: 105 },
    "G003": { id: "G003", name: "にんじん", unitPrice: 90, unit: "本", stock: 66 },
    "G004": { id: "G004", name: "牛こま切れ肉", unitPrice: 450, unit: "100g", stock: 40 },
    "G005": { id: "G005", name: "カレールー 中辛", unitPrice: 260, unit: "箱", stock: 120 }
};

const RECIPE_DB = [
    {
        id: "RECIPE001",
        name: "カレー",
        keywords: ["カレー", "カレーライス", "カレーの材料"],
        servings: 4,
        ingredients: [
            { ingredientName: "玉ねぎ", requiredQty: "2個", itemId: "G001" },
            { ingredientName: "じゃがいも", requiredQty: "3個", itemId: "G002" },
            { ingredientName: "にんじん", requiredQty: "1本", itemId: "G003" },
            { ingredientName: "牛こま切れ肉", requiredQty: "300g", itemId: "G004" },
            { ingredientName: "カレールー", requiredQty: "1箱", itemId: "G005" }
        ]
    }
];

const getRecipeByKeywordAPI = (keyword) => {
    if (!keyword) {
        return { error: "キーワードが指定されていません。" };
    }

    const normalizedKeyword = keyword.trim();
    const recipe = RECIPE_DB.find((entry) =>
        entry.keywords.some((k) => normalizedKeyword.includes(k))
    );

    if (!recipe) {
        return { error: `キーワード「${keyword}」に対応するレシピが見つかりませんでした。` };
    }

    return {
        keyword: normalizedKeyword,
        recipe: {
            recipeId: recipe.id,
            recipeName: recipe.name,
            servings: recipe.servings,
            requiredIngredients: recipe.ingredients
        },
        nextActionHint: "requiredIngredients[].itemId を使って get_item_info_by_id を呼び出してください。"
    };
};

const getItemInfoByIdAPI = (itemId) => {
    if (!itemId) {
        return { error: "商品IDが指定されていません。" };
    }

    const item = RECIPE_ITEM_DB[itemId];
    if (!item) {
        return { error: `商品ID「${itemId}」は見つかりませんでした。` };
    }

    return {
        itemId: item.id,
        itemName: item.name,
        unitPrice: item.unitPrice,
        unit: item.unit,
        stock: item.stock
    };
};


// --- 2. MCPサーバーの設定 ---
const server = new Server({ name: "my-custom-api", version: "1.0.0" }, { capabilities: { tools: {} } });

// ツールの定義（Geminiにこの仕様が伝わります）
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "get_employee_info",
            description: "社員IDから、その社員の名前と所属部署を取得します。",
            inputSchema: {
                type: "object",
                properties: {
                    employeeId: { type: "string", description: "社員ID (例: E001)" }
                },
                required: ["employeeId"]
            }
        },
        {
            name: "get_recipe_by_keyword",
            description: "レシピキーワードからレシピ情報と必要具材情報を返します。具材の itemId は別ツールで商品詳細取得に使います。",
            inputSchema: {
                type: "object",
                properties: {
                    keyword: { type: "string", description: "レシピを特定するキーワード (例: カレー)" }
                },
                required: ["keyword"]
            }
        },
        {
            name: "get_item_info_by_id",
            description: "商品IDから商品情報（商品名、単価、単位、在庫）を取得します。",
            inputSchema: {
                type: "object",
                properties: {
                    itemId: { type: "string", description: "商品ID (例: G001)" }
                },
                required: ["itemId"]
            }
        }
    ]
}));

// ツールの実行ルーティング
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "get_employee_info") {
        const result = getEmployeeInfoAPI(request.params.arguments.employeeId);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }]
        };
    }
    if (request.params.name === "get_recipe_by_keyword") {
        const result = getRecipeByKeywordAPI(request.params.arguments.keyword);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }]
        };
    }
    if (request.params.name === "get_item_info_by_id") {
        const result = getItemInfoByIdAPI(request.params.arguments.itemId);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }]
        };
    }
    throw new Error("Unknown tool");
});

// stdioトランスポートで起動
const transport = new StdioServerTransport();
server.connect(transport);