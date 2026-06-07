const express = require('express');
const router = express.Router();
const llmService = require('../services/llm');

router.post('/', async (req, res) => {
    // ヘッダーからAPIキーを取得
    const apiKey = req.headers['x-gemini-api-key'];
    const { messages } = req.body;

    if (!apiKey) {
        return res.status(401).json({ status: 'error', message: 'API Key is missing' });
    }
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ status: 'error', message: 'Invalid messages format' });
    }

    try {
        const result = await llmService.processChat(apiKey, messages);
        res.json({
            status: 'success',
            reply: result.reply,
            toolLogs: result.toolLogs
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
});

module.exports = router;