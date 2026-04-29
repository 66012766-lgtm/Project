const mongoose = require("mongoose");

const userBranchSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    user_id: { type: Number, required: true, index: true },
    branch_id: { type: Number, required: true, index: true },
  },
  {
    timestamps: true,
    collection: "user_branches",
  }
);

userBranchSchema.index({ user_id: 1, branch_id: 1 }, { unique: true });

module.exports = mongoose.model("UserBranch", userBranchSchema);