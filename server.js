const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
// const { connectDB, sequelize } = require("./config/db.config");
const { sequelize, Message } = require("./models/index");
const apiRoutes = require("./routes/index");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }, // Allows Flutter app to connect
});

app.set("socketio", io);

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api", apiRoutes);

// Connect Database
// connectDB();

sequelize
  .sync({ alter: true })
  .then(() => console.log("✅ Database & Tables Synchronized"))
  .catch((err) => console.log("❌ Sync Error: " + err));

// --- Socket.io Logic ---
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join_expert", (expertId) => {
    socket.join(`expert_${expertId}`);
  });

  socket.on("join_session", (sessionId) => {
    socket.join(`session_${sessionId}`);
    console.log(`User joined room: session_${sessionId}`);
  });

  socket.on("send_message", async (data) => {
    await Message.create({
      consultationId: data.sessionId,
      senderId: data.senderId,
      text: data.text,
    });

    io.to(`session_${data.sessionId}`).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Test Route
app.get("/", (req, res) => res.send("API Running..."));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
