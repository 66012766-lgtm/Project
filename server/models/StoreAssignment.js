const mongoose = require("mongoose");

const storeAssignmentSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true },
    username: { type: String, default: "", trim: true },
    store_name_brand: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
    collection: "store_assignments",
  }
);

module.exports = mongoose.model("StoreAssignment", storeAssignmentSchema);