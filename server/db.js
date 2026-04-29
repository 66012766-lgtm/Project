require("dotenv").config();
const mongoose = require("mongoose");

if (!process.env.MONGO_URI) {
  throw new Error("Missing environment variable: MONGO_URI");
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || undefined,
    });

    console.log("✅ เชื่อมต่อ MongoDB สำเร็จแล้ว!");
  } catch (error) {
    console.error("❌ เชื่อมต่อ MongoDB ไม่สำเร็จ:", error.message);
    console.error("รายละเอียด:", error);
    process.exit(1);
  }
}

module.exports = connectDB;