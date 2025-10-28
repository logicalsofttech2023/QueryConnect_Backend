import mongoose from "mongoose";

const querySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: { type: String, required: true },
    startTime: { type: String, default: "12:00 PM" },
    endTime: { type: String, default: "05:00 PM" },
    industry: { type: String, required: true },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    comments: [{ type: String }],
  },
  { timestamps: true }
);

const Query = mongoose.model("Query", querySchema);
export default Query;
