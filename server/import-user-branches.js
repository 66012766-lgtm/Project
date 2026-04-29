import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);

async function run() {
  try {
    await client.connect();

    const adminDb = client.db().admin();
    const dbList = await adminDb.listDatabases();
    console.log("📦 databases:", dbList.databases.map((d) => d.name));

    // ใช้ DB smartfarm ให้ตรงกับ .env ของคุณ
    const db = client.db("smartfarm");

    const usersCol = db.collection("users");
    const branchesCol = db.collection("branches");
    const userBranchesCol = db.collection("user_branches");

    const users = await usersCol.find({}).toArray();
    console.log("👤 users count =", users.length);

    if (!users.length) {
      throw new Error("ไม่พบข้อมูลใน collection users ของ DB smartfarm");
    }

    const filePath = path.join(process.cwd(), "user-branches.txt");
    const raw = fs.readFileSync(filePath, "utf8");

    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.trim());

    if (lines.length <= 1) {
      throw new Error("ไฟล์ user-branches.txt ไม่มีข้อมูล");
    }

    const dataLines = lines.slice(1);

    const rows = dataLines.map((line, index) => {
      const parts = line.split("\t");

      if (parts.length < 5) {
        throw new Error(`ข้อมูลบรรทัดที่ ${index + 2} ไม่ครบ: ${line}`);
      }

      const [retailer, brand, storeName, displayName, username] = parts;

      return {
        retailer: retailer?.trim() || "",
        brand: brand?.trim() || "",
        store_name: storeName?.trim() || "",
        display_name: displayName?.trim() || "",
        username: username?.trim() || "",
      };
    });

    const userMap = new Map();
    for (const user of users) {
      if (user.username && typeof user.id === "number") {
        userMap.set(user.username.trim(), user.id);
      }
    }

    const uniqueBranchMap = new Map();

    for (const row of rows) {
      if (!row.display_name) continue;

      if (!uniqueBranchMap.has(row.display_name)) {
        uniqueBranchMap.set(row.display_name, {
          display_name: row.display_name,
          branch_name: row.store_name,
          retailer: row.retailer,
          brand: row.brand,
          store_name: row.store_name,
        });
      }
    }

    const uniqueBranches = Array.from(uniqueBranchMap.values()).map(
      (branch, index) => ({
        id: index + 1,
        ...branch,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await branchesCol.deleteMany({});
    if (uniqueBranches.length > 0) {
      await branchesCol.insertMany(uniqueBranches);
    }

    const insertedBranches = await branchesCol.find({}).toArray();
    const branchMap = new Map();

    for (const branch of insertedBranches) {
      if (branch.display_name && typeof branch.id === "number") {
        branchMap.set(branch.display_name.trim(), branch.id);
      }
    }

    const rawUserBranches = [];
    const missingUsers = new Set();

    for (const row of rows) {
      const userId = userMap.get(row.username);
      const branchId = branchMap.get(row.display_name);

      if (!userId) {
        missingUsers.add(row.username);
        continue;
      }

      if (!branchId) continue;

      rawUserBranches.push({
        user_id: userId,
        branch_id: branchId,
      });
    }

    const dedupMap = new Map();
    for (const item of rawUserBranches) {
      const key = `${item.user_id}-${item.branch_id}`;
      if (!dedupMap.has(key)) {
        dedupMap.set(key, item);
      }
    }

    const finalUserBranches = Array.from(dedupMap.values()).map(
      (item, index) => ({
        id: index + 1,
        user_id: item.user_id,
        branch_id: item.branch_id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await userBranchesCol.deleteMany({});
    if (finalUserBranches.length > 0) {
      await userBranchesCol.insertMany(finalUserBranches);
    }

    console.log(" import สำเร็จ");
    console.log(`branches: ${uniqueBranches.length}`);
    console.log(` user_branches: ${finalUserBranches.length}`);

    if (missingUsers.size > 0) {
      console.log("users ที่ไม่พบใน collection users:");
      console.log([...missingUsers]);
    }
  } catch (err) {
    console.error("error:", err.message);
  } finally {
    await client.close();
  }
}

run();