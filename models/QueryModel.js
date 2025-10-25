import mongoose from "mongoose";

const querySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: { type: String, required: true },
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
