const { Consultation, User, sequelize } = require("../models");

// 1. User books consultation - Includes Wallet Check
exports.bookSession = async (req, res) => {
  try {
    const { expertId, price } = req.body;
    const user = await User.findByPk(req.user.id);

    if (user.walletBalance < price) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    const booking = await Consultation.create({
      userId: req.user.id,
      expertId,
      price,
      status: "pending",
    });
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Expert fetches their pending requests
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await Consultation.findAll({
      where: {
        expertId: req.user.id,
        status: "pending",
      },
      include: [{ model: User, as: "client", attributes: ["name", "email"] }],
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Expert accepts the session
exports.acceptSession = async (req, res) => {
  try {
    const { id } = req.params;
    const consultation = await Consultation.findByPk(id);

    if (!consultation) {
      return res.status(404).json({ message: "Consultation not found" });
    }

    await consultation.update({ status: "active" });

    // Emit socket event so the User's WaitingScreen moves to ChatScreen
    const io = req.app.get("socketio");
    io.to(`session_${id}`).emit("session_active", { sessionId: id });

    res.json({ message: "Session is now ACTIVE" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Expert fetches history of served clients
exports.getServedClients = async (req, res) => {
    try {
        const history = await Consultation.findAll({
            where: {
                expertId: req.user.id,
                status: "ended" // Only show completed sessions
            },
            include: [{ 
                model: User, 
                as: "client", 
                attributes: ["id", "name", "email"] 
            }],
            order: [['updatedAt', 'DESC']] // Newest first
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. End Session & Deduct Wallet (Atomic Transaction)
exports.endSession = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const session = await Consultation.findByPk(id);

    if (!session || session.status !== "active") {
      return res
        .status(400)
        .json({ message: "Invalid or already ended session" });
    }

    // Update session status
    await session.update({ status: "ended" }, { transaction: t });

    // Atomic Fund Transfer: Deduct from User, Add to Expert
    await User.decrement("walletBalance", {
      by: session.price,
      where: { id: session.userId },
      transaction: t,
    });

    await User.increment("walletBalance", {
      by: session.price,
      where: { id: session.expertId },
      transaction: t,
    });

    await t.commit();

    // Optional: Notify both users of the updated balance via Socket
    const io = req.app.get("socketio");
    io.to(`session_${id}`).emit("wallet_updated");

    res.json({ message: "Session ended and payment processed" });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};
