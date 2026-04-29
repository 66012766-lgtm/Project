const mongoose = require("mongoose");

const workLogSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    user_id: { type: Number, required: true, index: true },
    branch_id: { type: Number, default: null, index: true },
    workplace: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    issue_text: { type: String, default: "", trim: true },
    resolution_text: { type: String, default: "", trim: true },
    work_date: { type: String, default: "", trim: true },
    before_images: { type: [String], default: [] },
    after_images: { type: [String], default: [] },
    retailer: { type: String, default: "", trim: true },
    brand: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
    collection: "work_log",
  }
);

module.exports = mongoose.model("WorkLog", workLogSchema);