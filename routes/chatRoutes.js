const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.get('/history/:sessionId', protect, chatController.getChatHistory);

module.exports = router;