import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);

async function run() {
  try {
    await client.connect();

    const db = client.db("smartfarm");
    const usersCol = db.collection("users");

    const users = [
      { id: 1, username: "kongkrit", password: "1234", role: "staff" },
      { id: 2, username: "mali", password: "1234", role: "staff" },
      { id: 3, username: "mathawee", password: "1234", role: "staff" },
      { id: 4, username: "thanthaporn", password: "1234", role: "staff" },
      { id: 5, username: "phurichaya", password: "1234", role: "staff" },
    ].map((u) => ({
      ...u,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await usersCol.deleteMany({});
    await usersCol.insertMany(users);

    console.log("✅ users imported:", users.length);
  } catch (err) {
    console.error("❌ error:", err.message);
  } finally {
    await client.close();
  }
}

run();