import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// กรอกของ MySQL เดิมให้ตรง
const MYSQL_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "your_old_database_name",
  port: Number(process.env.DB_PORT || 3306),
};

async function migrate() {
  let mysqlConn;
  let mongoClient;

  try {
    mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
    console.log("MySQL Connected");

    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log(" MongoDB Connected");

    const mongoDb = mongoClient.db("smartfarm");

    // 1) users
    try {
      const [users] = await mysqlConn.execute("SELECT * FROM users");
      if (users.length > 0) {
        await mongoDb.collection("users").deleteMany({});
        await mongoDb.collection("users").insertMany(
          users.map((u) => ({
            ...u,
            migratedAt: new Date(),
          })),
        );
        console.log(` users migrated: ${users.length} records`);
      } else {
        console.log("ℹ users: no data");
      }
    } catch (err) {
      console.log(" ข้ามตาราง users:", err.message);
    }

    // 2) visits
    try {
      const [visits] = await mysqlConn.execute("SELECT * FROM visits");
      if (visits.length > 0) {
        await mongoDb.collection("visits").deleteMany({});
        await mongoDb.collection("visits").insertMany(
          visits.map((v) => ({
            ...v,
            migratedAt: new Date(),
          })),
        );
        console.log(` visits migrated: ${visits.length} records`);
      } else {
        console.log("ℹ visits: no data");
      }
    } catch (err) {
      console.log("ข้ามตาราง visits:", err.message);
    }

    // 3) complaints
    try {
      const [complaints] = await mysqlConn.execute("SELECT * FROM complaints");
      if (complaints.length > 0) {
        await mongoDb.collection("complaints").deleteMany({});
        await mongoDb.collection("complaints").insertMany(
          complaints.map((c) => ({
            ...c,
            migratedAt: new Date(),
          })),
        );
        console.log(` complaints migrated: ${complaints.length} records`);
      } else {
        console.log("ℹ complaints: no data");
      }
    } catch (err) {
      console.log("⚠️ ข้ามตาราง complaints:", err.message);
    }

    console.log("🎉 Migration completed");
  } catch (err) {
    console.error("❌ Migration error:", err.message);
  } finally {
    if (mysqlConn) await mysqlConn.end();
    if (mongoClient) await mongoClient.close();
  }
}

migrate();