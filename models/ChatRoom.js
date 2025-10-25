import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      required: true,
    },
    queryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Query",
      required: true,
    },
    lastMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ChatRoom", chatRoomSchema);
