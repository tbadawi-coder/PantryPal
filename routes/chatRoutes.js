const express = require('express');
const controller = require('../controller/chatController');

const router = express.Router();

// Route to display the chat page
router.get('/', controller.displayChat);

// Route to handle chat messages
router.post('/message', controller.handleMessage);

module.exports = router;
