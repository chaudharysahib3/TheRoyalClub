
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

let io;

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      // Backend-only phase: this allows local development clients.
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id || decoded.userId || decoded._id;

      if (!userId) {
        return next(new Error("Invalid token payload"));
      }

      const user = await User.findById(userId).select("_id role status");

      if (!user) {
        return next(new Error("User not found"));
      }

      if (user.status && user.status !== "active") {
        return next(new Error("Account is inactive"));
      }

      socket.user = {
        id: user._id.toString(),
        role: String(user.role).toLowerCase(),
      };

      next();
    } catch (error) {
      next(new Error("Socket authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const { id, role } = socket.user;

    socket.join(`user:${id}`);
    socket.join(`role:${role}`);

    console.log(`Socket connected: ${id}, role: ${role}`);

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${id}, reason: ${reason}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
}

function emitToRoles(roles, event, payload) {
  getIO()
    .to(roles.map((role) => `role:${role.toLowerCase()}`))
    .emit(event, payload);
}

function emitToUser(userId, event, payload) {
  getIO().to(`user:${userId}`).emit(event, payload);
}

module.exports = {
  initializeSocket,
  getIO,
  emitToRoles,
  emitToUser,
};

