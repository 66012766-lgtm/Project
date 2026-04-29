import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import fs from "fs";
import "./import-user-branches.js";
dotenv.config();

if (!process.env.MONGODB_URI) {
  console.error("❌ ไม่พบ MONGODB_URI ใน .env");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);

async function run() {
  try {
    await client.connect();
    const db = client.db("smartfarm");

    // อ่านไฟล์ txt ที่คุณมี
    const raw = fs.readFileSync("./user-branches.txt", "utf8");

    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    if (lines.length <= 1) {
      console.log("❌ ไม่พบข้อมูลใน user-branches.txt");
      return;
    }

    // ข้าม header แถวแรก
    const dataLines = lines.slice(1);

    const docs = dataLines.map((line) => {
      const parts = line.split("\t");

      return {
        retailer: parts[0]?.trim() || "",
        brand: parts[1]?.trim() || "",
        storeName: parts[2]?.trim() || "",
        storeNameBrand: parts[3]?.trim() || "",
        username: parts[4]?.trim() || "",
        createdAt: new Date(),
      };
    }).filter((item) => item.username && item.storeNameBrand);

    const collection = db.collection("user_branches");

    await collection.deleteMany({});
    await collection.insertMany(docs);

    console.log(`✅ import user_branches สำเร็จ ${docs.length} รายการ`);

    const users = [...new Set(docs.map((d) => d.username))];
    console.log("👤 users ที่มีสาขา:", users.join(", "));
  } catch (err) {
    console.error("❌ seed error:", err.message);
  } finally {
    await client.close();
  }
}

run();