const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { sequelize, Message } = require("./models/index");
const apiRoutes = require("./routes/index");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// 🔥 Store userId → socketId mapping
const userSocketMap = {};
app.set("userSocketMap", userSocketMap);

app.set("socketio", io);

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api", apiRoutes);

// Sync Database
sequelize
  .sync({ alter: true })
  .then(() => console.log("✅ Database & Tables Synchronized"))
  .catch((err) => console.log("❌ Sync Error: " + err));

// ================= SOCKET.IO =================
io.on("connection", (socket) => {
  console.log("🟢 A user connected:", socket.id);

  // ---------- JOIN USER ROOM ----------
  socket.on("join_user", (userId) => {
    socket.join(`user_${userId}`);

    // Save socket mapping
    userSocketMap[userId] = socket.id;

    console.log(`🟢 User joined room: user_${userId}`);
    console.log("Current userSocketMap:", userSocketMap);
  });

  // ---------- JOIN EXPERT ROOM ----------
  socket.on("join_expert", (expertId) => {
    socket.join(`expert_${expertId}`);
    console.log(`🟢 Expert joined room: expert_${expertId}`);
  });

  // ---------- JOIN SESSION ROOM ----------
  socket.on("join_session", (sessionId) => {
    socket.join(`session_${sessionId}`);
    console.log(`🟢 User joined room: session_${sessionId}`);
  });

  // ---------- SEND MESSAGE ----------
  socket.on("send_message", async (data) => {
    try {
      const message = await Message.create({
        consultationId: data.sessionId,
        senderId: data.senderId,
        text: data.text,
      });

      const fullMessage = await Message.findByPk(message.id, {
        include: [
          {
            model: require("./models").User,
            as: "sender",
            attributes: ["name"],
          },
        ],
      });

      io.to(`session_${data.sessionId}`).emit("receive_message", fullMessage);
    } catch (error) {
      console.error("Message Error:", error);
    }
  });

  // ---------- DISCONNECT ----------
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);

    // Remove user from socket map
    for (const userId in userSocketMap) {
      if (userSocketMap[userId] === socket.id) {
        delete userSocketMap[userId];
        console.log(`Removed user ${userId} from socket map`);
      }
    }

    console.log("Updated userSocketMap:", userSocketMap);
  });
});

// ================= SERVER START =================
app.get("/", (req, res) => res.send("API Running..."));

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
