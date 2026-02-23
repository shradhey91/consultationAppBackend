const { Consultation, User, sequelize } = require("../models");

// 1. User books consultation - Includes Wallet Check
exports.bookSession = async (req, res) => {
  try {
    const { expertId } = req.body;

    const user = await User.findByPk(req.user.id);
    const expert = await User.findByPk(expertId);

    if (!expert || expert.role !== "expert") {
      return res.status(404).json({ message: "Expert not found" });
    }

    // 🔐 Do NOT trust frontend
    const pricePerMin = parseFloat(expert.feePerMin);

    if (user.walletBalance < pricePerMin) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    const booking = await Consultation.create({
      userId: req.user.id,
      expertId,
      price: pricePerMin, // store per-minute price for now
      status: "pending",
    });

    const fullBooking = await Consultation.findByPk(booking.id, {
      include: [{ model: User, as: "client", attributes: ["name", "email"] }],
    });

    const io = req.app.get("socketio");

    io.to(`expert_${expertId}`).emit("new_booking", fullBooking);
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

    if (consultation.expertId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (consultation.status !== "pending") {
      return res.status(400).json({ message: "Session already processed" });
    }

    // ✅ Activate session
    await consultation.update({
      status: "active",
      startTime: new Date(),
    });

    const io = req.app.get("socketio");
    const userSocketMap = req.app.get("userSocketMap");

    console.log("🔵 Emitting session_active...");
    console.log("Session room:", `session_${id}`);
    console.log("User room:", `user_${consultation.userId}`);

    // 🔹 Emit to session room (backup)
    io.to(`session_${id}`).emit("session_active", {
      sessionId: id,
    });

    // 🔹 Emit directly to client socket (guaranteed)
    const clientSocketId = userSocketMap[consultation.userId];

    if (clientSocketId) {
      io.to(clientSocketId).emit("session_active", {
        sessionId: id,
      });
      console.log("✅ Sent session_active directly to socket:", clientSocketId);
    } else {
      console.log("❌ Client socket not found for user:", consultation.userId);
    }

    res.json({ message: "Session is now ACTIVE" });
  } catch (error) {
    console.error("Accept Session Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Expert fetches history of served clients
exports.getServedClients = async (req, res) => {
  try {
    const history = await Consultation.findAll({
      where: {
        expertId: req.user.id,
        status: "ended", // Only show completed sessions
      },
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["updatedAt", "DESC"]], // Newest first
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

    const session = await Consultation.findByPk(id, { transaction: t });

    if (!session || session.status !== "active") {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Invalid or already ended session" });
    }

    // 🔐 Authorization check
    if (session.userId !== req.user.id && session.expertId !== req.user.id) {
      await t.rollback();
      return res
        .status(403)
        .json({ message: "Not authorized to end this session" });
    }

    if (!session.startTime) {
      await t.rollback();
      return res.status(400).json({ message: "Session start time missing" });
    }

    const endTime = new Date();

    // ⏱ Calculate duration
    const durationMs = endTime - new Date(session.startTime);
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));

    const pricePerMin = parseFloat(session.price);
    const totalAmount = durationMinutes * pricePerMin;

    const user = await User.findByPk(session.userId, { transaction: t });

    if (parseFloat(user.walletBalance) < totalAmount) {
      await t.rollback();
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    // Update session with billing data
    await session.update(
      {
        status: "ended",
        endTime,
        totalAmount,
      },
      { transaction: t },
    );

    // Deduct from client
    await User.decrement("walletBalance", {
      by: totalAmount,
      where: { id: session.userId },
      transaction: t,
    });

    // Add to expert
    await User.increment("walletBalance", {
      by: totalAmount,
      where: { id: session.expertId },
      transaction: t,
    });

    await t.commit();

    const io = req.app.get("socketio");
    io.to(`session_${id}`).emit("wallet_updated", {
      totalAmount,
      durationMinutes,
    });

    res.json({
      message: "Session ended and payment processed",
      durationMinutes,
      totalAmount,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};
