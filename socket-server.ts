import { createServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

interface OnlineUser {
  userId: string;
  socketId: string;
}

const onlineUsers: OnlineUser[] = [];

const addUser = (userId: string, socketId: string) => {
  // Remove existing entry for same user (reconnects)
  const index = onlineUsers.findIndex((u) => u.userId === userId);
  if (index !== -1) onlineUsers.splice(index, 1);
  onlineUsers.push({ userId, socketId });
};

const removeUser = (socketId: string) => {
  const index = onlineUsers.findIndex((user) => user.socketId === socketId);
  if (index !== -1) onlineUsers.splice(index, 1);
};

const getUser = (userId: string) => {
  return onlineUsers.find((user) => user.userId === userId);
};

const port = parseInt(process.env.PORT || "4000", 10);

const httpServer = createServer((_, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", onlineUsers: onlineUsers.length }));
});

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on("connection", (socket: Socket) => {
  console.log("🔌 User connected:", socket.id);

  // Setup user
  socket.on("setup", (userId: string) => {
    addUser(userId, socket.id);
    socket.join(userId);
    io.emit("online-users", onlineUsers.map((u) => u.userId));
    console.log(`👤 User ${userId} is online (${onlineUsers.length} total)`);
  });

  // Join a chat room
  socket.on("join-chat", (room: string) => {
    socket.join(room);
  });

  // Leave a chat room
  socket.on("leave-chat", (room: string) => {
    socket.leave(room);
  });

  // Typing indicators
  socket.on("typing", (room: string) => {
    socket.in(room).emit("typing", room);
  });

  socket.on("stop-typing", (room: string) => {
    socket.in(room).emit("stop-typing", room);
  });

  // New message
  socket.on("new-message", (newMessage: {
    _id: string;
    chat: { _id: string; users: Array<{ _id: string }> };
    sender: { _id: string };
  }) => {
    const chat = newMessage.chat;
    if (!chat.users) return;

    chat.users.forEach((user) => {
      if (user._id === newMessage.sender._id) return;
      socket.in(user._id).emit("message-received", newMessage);

      // If the recipient is online, notify sender as delivered
      const onlineUser = getUser(user._id);
      if (onlineUser) {
        io.to(newMessage.sender._id).emit("message-delivered", {
          messageId: newMessage._id,
          chatId: chat._id,
        });
      }
    });
  });

  // Message read — recipient opened the chat
  socket.on("messages-read", (data: {
    chatId: string;
    readerId: string;
    messageIds: string[];
    userIds?: string[];
  }) => {
    // Emit to chat room
    io.in(data.chatId).emit("messages-read", data);
    // Also emit to each user's personal room for reliability
    if (data.userIds) {
      data.userIds.forEach((userId) => {
        io.to(userId).emit("messages-read", data);
      });
    }
  });

  // Notification
  socket.on("send-notification", (data: { receiverId: string; notification: unknown }) => {
    const user = getUser(data.receiverId);
    if (user) {
      socket.to(user.socketId).emit("notification-received", data.notification);
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    removeUser(socket.id);
    io.emit("online-users", onlineUsers.map((u) => u.userId));
  });
});

httpServer.listen(port, () => {
  console.log(`🚀 Socket.IO server running on port ${port}`);
});
