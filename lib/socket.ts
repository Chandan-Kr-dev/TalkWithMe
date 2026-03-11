import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

interface OnlineUser {
  userId: string;
  socketId: string;
}

let io: SocketIOServer | null = null;
const onlineUsers: OnlineUser[] = [];

const addUser = (userId: string, socketId: string) => {
  if (!onlineUsers.some((user) => user.userId === userId)) {
    onlineUsers.push({ userId, socketId });
  }
};

const removeUser = (socketId: string) => {
  const index = onlineUsers.findIndex((user) => user.socketId === socketId);
  if (index !== -1) onlineUsers.splice(index, 1);
};

const getUser = (userId: string) => {
  return onlineUsers.find((user) => user.userId === userId);
};

export function initSocket(server: HTTPServer) {
  if (io) return io;

  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log("🔌 User connected:", socket.id);

    // Setup user
    socket.on("setup", (userId: string) => {
      addUser(userId, socket.id);
      socket.join(userId);
      io?.emit("online-users", onlineUsers.map((u) => u.userId));
      console.log(`👤 User ${userId} is online`);
    });

    // Join a chat room
    socket.on("join-chat", (room: string) => {
      socket.join(room);
      console.log(`📌 User joined room: ${room}`);
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
      chat: { _id: string; users: Array<{ _id: string }> };
      sender: { _id: string };
    }) => {
      const chat = newMessage.chat;
      if (!chat.users) return;

      chat.users.forEach((user) => {
        if (user._id === newMessage.sender._id) return;
        socket.in(user._id).emit("message-received", newMessage);
      });
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
      io?.emit("online-users", onlineUsers.map((u) => u.userId));
    });
  });

  return io;
}

export function getIO() {
  return io;
}
