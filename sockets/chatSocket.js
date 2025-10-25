import ChatMessage from "../models/ChatMessage.js";
import ChatRoom from "../models/ChatRoom.js";

const onlineUsers = new Map();

export default function chatSocket(io) {
  io.on("connection", (socket) => {
    console.log("🟢 New client connected:", socket.id);

    // Join specific chat room
    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // Handle new message
    socket.on("sendMessage", async (data) => {
      const { roomId, senderId, senderType, message } = data;

      try {
        // Save message
        const newMsg = await ChatMessage.create({
          roomId,
          senderId,
          senderType,
          message,
        });

        // Update last message in ChatRoom
        await ChatRoom.findByIdAndUpdate(roomId, { lastMessage: message });

        // Broadcast to all in room
        console.log("Message sent:", newMsg);
        io.to(roomId).emit("receiveMessage", newMsg);
      } catch (err) {
        console.log("Message error:", err);
      }
    });

    socket.on("disconnect", () => {
      for (let [id, info] of onlineUsers) {
        if (info.socketId === socket.id) {
          onlineUsers.delete(id);
          console.log(`${info.type} disconnected: ${id}`);
          break;
        }
      }
    });
  });
}
