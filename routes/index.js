const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const consultationRoutes = require('./consultationRoutes');
const chatRoutes = require('./chatRoutes');

router.use('/auth', authRoutes);
router.use('/consult', consultationRoutes);
router.use('/chat', chatRoutes);

module.exports = router;