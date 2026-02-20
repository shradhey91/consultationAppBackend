const { Consultation, User, sequelize } = require('../models');

// 1. User books consultation
exports.bookSession = async (req, res) => {
    try {
        const { expertId, price } = req.body;
        const booking = await Consultation.create({
            userId: req.user.id, // from auth middleware
            expertId,
            price,
            status: 'pending'
        });
        res.status(201).json(booking);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Expert accepts
exports.acceptSession = async (req, res) => {
    try {
        const { id } = req.params;
        await Consultation.update({ status: 'active' }, { where: { id } });
        res.json({ message: "Session is now ACTIVE" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. End Session & Deduct Wallet (The Transaction)
exports.endSession = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const session = await Consultation.findByPk(id);

        // Update status
        session.status = 'ended';
        await session.save({ transaction: t });

        // Logic: Move money from User to Expert
        await User.decrement('walletBalance', { by: session.price, where: { id: session.userId }, transaction: t });
        await User.increment('walletBalance', { by: session.price, where: { id: session.expertId }, transaction: t });

        await t.commit();
        res.json({ message: "Session ended and payment processed" });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
};