const { Message, User } = require('../models');

exports.getChatHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const messages = await Message.findAll({
            where: { consultationId: sessionId },
            include: [{ model: User, as: 'sender', attributes: ['name'] }],
            order: [['createdAt', 'ASC']]
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};