const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    display_name: { type: String, required: true, trim: true, unique: true },
    branch_name: { type: String, default: "", trim: true },
    retailer: { type: String, default: "", trim: true },
    brand: { type: String, default: "", trim: true },
    store_name: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
    collection: "branches",
  }
);

module.exports = mongoose.model("Branch", branchSchema);