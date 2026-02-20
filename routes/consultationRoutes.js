const express = require('express');
const router = express.Router();
const consultController = require('../controllers/consultationController');
const { protect } = require('../middleware/authMiddleware'); // We'll make this next

router.post('/book', protect, consultController.bookSession);
router.put('/accept/:id', protect, consultController.acceptSession);
router.post('/end/:id', protect, consultController.endSession);

module.exports = router;