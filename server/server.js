import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options('/*', cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

if (!process.env.MONGODB_URI) {
  console.error("❌ ไม่พบ MONGODB_URI ในไฟล์ .env");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI, {
  tls: true,
  tlsAllowInvalidCertificates: true,
});

let db;

function isValidObjectId(value) {
  return ObjectId.isValid(value);
}

function normalizeUser(doc) {
  return {
    mongo_id: doc._id?.toString?.() || "",
    id: doc.id ?? null,
    username: doc.username || "",
    password: doc.password || "",
    full_name: doc.full_name || "",
    role: doc.role || "user",
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
}


function normalizeBranch(doc) {
  return {
    mongo_id: doc._id?.toString?.() || "",
    id: doc.id ?? null,

    display_name:
      doc.store_name_brand ||
      doc.store_name ||
      doc["Retailer - Store Name"] ||
      doc.name ||
      "",

    branch_name:
      doc.store_name_brand ||
      doc.store_name ||
      doc.name ||
      "",

    retailer: doc.retailer || doc.Retailer || "",
    brand: doc.brand || doc.Brand || "",
    store_name: doc.store_name || doc["Retailer - Store Name"] || "",
    user: doc.username || doc.user || doc.User || "",
    User: doc.username || doc.User || doc.user || "",
  };
}
function normalizeVisit(doc) {
  return {
    id: doc.id ?? null,
    username: doc.username || "",
    visit_date: doc.visit_date || "",
    branch_display_name: doc.branch_display_name || "",
    retailer: doc.retailer || "",
    brand: doc.brand || "",
    store_name: doc.store_name || "",
    purpose: doc.purpose || "",
    detail: doc.detail || "",
    solution: doc.solution || "",
    before_images: doc.before_images || [],
    after_images: doc.after_images || [],
    createdAt: doc.createdAt || null,
  };
}

async function getBranchesForUser(user) {
  const username = String(user?.username || "").trim();
  const role = String(user?.role || "").trim().toLowerCase();

  // ✅ admin เห็นทุกสาขา
  if (role === "admin" || username === "admin") {
    return await db
      .collection("branches")
      .find({})
      .sort({ display_name: 1, "Retailer - Store Name": 1 })
      .toArray();
  }

  // ✅ user ทั่วไป เห็นเฉพาะสาขาของตัวเอง
 const branchesByUser = await db
  .collection("user_branches")
  .find({
    username: username,
  })
    .sort({ display_name: 1, "Retailer - Store Name": 1 })
    .toArray();

  if (branchesByUser.length > 0) {
    return branchesByUser;
  }

  const links = await db
    .collection("user_branches")
    .find({ user_id: user.id })
    .toArray();

  const branchIds = links.map((x) => x.branch_id);

  if (!branchIds.length) return [];

 return await db
  .collection("user_branches")
 .find({ store_name_brand: { $in: branchIds } })
 .sort({ store_name_brand: 1 })
    .toArray();
}
async function connectDB() {
  try {
    await client.connect();
    db = client.db("kanokwan");
    console.log("✅ MongoDB Connected -> kanokwan");
  } catch (err) {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  }
}

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.send("API is working");
});

/* ================= USERS ================= */
app.get("/api/users", async (req, res) => {
  try {
    const users = await db.collection("users").find({}).sort({ id: 1 }).toArray();
    
    res.json(users.map(normalizeUser));
  } catch (err) {
    console.error("❌ Get users error:", err);
    res.status(500).json({
      success: false,
      message: "โหลด users ไม่สำเร็จ",
    });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอก username และ password",
      });
    }

    const existing = await db.collection("users").findOne({
      username: String(username).trim(),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "มี username นี้อยู่แล้ว",
      });
    }

    const lastUser = await db
      .collection("users")
      .find({})
      .sort({ id: -1 })
      .limit(1)
      .toArray();

    const nextId = lastUser.length ? Number(lastUser[0].id || 0) + 1 : 1;

    const result = await db.collection("users").insertOne({
      id: nextId,
      username: String(username).trim(),
      password: String(password).trim(),
      full_name: full_name ? String(full_name).trim() : "",
      role: role ? String(role).trim().toLowerCase() : "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      mongo_id: result.insertedId.toString(),
      id: nextId,
      message: "เพิ่มผู้ใช้สำเร็จ",
    });
  } catch (err) {
    console.error("❌ Create user error:", err);
    res.status(500).json({
      success: false,
      message: "เพิ่มผู้ใช้ไม่สำเร็จ",
    });
  }
});

app.put("/api/users/:mongoId", async (req, res) => {
  try {
    const { mongoId } = req.params;
    const { username, password, full_name, role } = req.body;

    if (!isValidObjectId(mongoId)) {
      return res.status(400).json({
        success: false,
        message: "mongoId ไม่ถูกต้อง",
      });
    }

    const oldUser = await db.collection("users").findOne({
      _id: new ObjectId(mongoId),
    });

    if (!oldUser) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบ user",
      });
    }

    const nextUsername = String(username || oldUser.username).trim();

    const duplicate = await db.collection("users").findOne({
      username: nextUsername,
      _id: { $ne: new ObjectId(mongoId) },
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "username นี้ถูกใช้งานแล้ว",
      });
    }

    await db.collection("users").updateOne(
      { _id: new ObjectId(mongoId) },
      {
        $set: {
          username: nextUsername,
          password: password ? String(password).trim() : oldUser.password,
          full_name:
            full_name !== undefined
              ? String(full_name).trim()
              : oldUser.full_name || "",
          role:
            role !== undefined
              ? String(role).trim().toLowerCase()
              : oldUser.role || "user",
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: "แก้ไขผู้ใช้สำเร็จ",
    });
  } catch (err) {
    console.error("❌ Update user error:", err);
    res.status(500).json({
      success: false,
      message: "แก้ไขผู้ใช้ไม่สำเร็จ",
    });
  }
});

app.delete("/api/users/:mongoId", async (req, res) => {
  try {
    const { mongoId } = req.params;

    if (!isValidObjectId(mongoId)) {
      return res.status(400).json({
        success: false,
        message: "mongoId ไม่ถูกต้อง",
      });
    }

    const user = await db.collection("users").findOne({
      _id: new ObjectId(mongoId),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบ user",
      });
    }

    await db.collection("users").deleteOne({
      _id: new ObjectId(mongoId),
    });

    if (typeof user.id === "number") {
      await db.collection("user_branches").deleteMany({
        user_id: user.id,
      });
    }

    res.json({
      success: true,
      message: "ลบผู้ใช้สำเร็จ",
    });
  } catch (err) {
    console.error("❌ Delete user error:", err);
    res.status(500).json({
      success: false,
      message: "ลบผู้ใช้ไม่สำเร็จ",
    });
  }
});

/* ================= LOGIN ================= */
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอก username และ password",
      });
    }

    const user = await db.collection("users").findOne({
      username: String(username).trim(),
      password: String(password).trim(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "username หรือ password ไม่ถูกต้อง",
      });
    }

    const branches = await getBranchesForUser(user);

    res.json({
      success: true,
      user: {
        mongo_id: user._id.toString(),
        id: user.id,
        username: user.username,
        full_name: user.full_name || "",
        role: user.role || "user",
        branches: branches.map(normalizeBranch),
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ================= BRANCHES ================= */
app.get("/api/branches", async (req, res) => {
  try {
    const username = String(req.query.username || "").trim();
    const role = String(req.query.role || "").trim().toLowerCase();

    let query = {};

    if (username && username !== "admin" && role !== "admin") {
      query = { username };
    }

    const branches = await db
      .collection("user_branches")
      .find(query)
      .sort({ retailer: 1, store_name_brand: 1 })
      .toArray();

    res.json(branches.map(normalizeBranch));
  } catch (err) {
    console.error("❌ Get branches error:", err);
    res.status(500).json({
      success: false,
      message: "โหลด branches ไม่สำเร็จ",
    });
  }

});
app.post("/api/branches", async (req, res) => {
  try {
    const name = String(req.body.display_name || req.body.branch_name || "").trim();

    if (!name) {
      return res.status(400).json({ success: false, message: "กรุณากรอกชื่อสาขา" });
    }

    const exists = await db.collection("user_branches").findOne({
      store_name_brand: name,
    });

    if (exists) {
      return res.status(400).json({ success: false, message: "มีสาขานี้แล้ว" });
    }

    const doc = {
      username: "",
      retailer: "",
      brand: "",
      store_name: name,
      store_name_brand: name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("user_branches").insertOne(doc);

    res.json({
      success: true,
      mongo_id: result.insertedId.toString(),
      display_name: name,
      branch_name: name,
      store_name_brand: name,
    });
  } catch (err) {
    console.error("❌ Add branch error:", err);
    res.status(500).json({ success: false, message: "เพิ่มสาขาไม่สำเร็จ" });
  }
});
app.put("/api/branches/:branchName", async (req, res) => {
  try {
    const oldName = decodeURIComponent(String(req.params.branchName || "")).trim();
    const newName = String(req.body.display_name || req.body.branch_name || "").trim();

    if (!oldName || !newName) {
      return res.status(400).json({ success: false, message: "ข้อมูลไม่ครบ" });
    }

    await db.collection("user_branches").updateMany(
      { store_name_brand: oldName },
      {
        $set: {
          store_name: newName,
          store_name_brand: newName,
          updatedAt: new Date(),
        },
      }
    );

    res.json({ success: true, message: "แก้ไขสาขาสำเร็จ" });
  } catch (err) {
    console.error("❌ Update branch error:", err);
    res.status(500).json({ success: false, message: "แก้ไขสาขาไม่สำเร็จ" });
  }
});
app.delete("/api/branches/:branchName", async (req, res) => {
  try {
    const branchName = decodeURIComponent(String(req.params.branchName || "")).trim();

    if (!branchName) {
      return res.status(400).json({ success: false, message: "ไม่พบชื่อสาขา" });
    }

    await db.collection("user_branches").deleteMany({
      store_name_brand: branchName,
    });

    res.json({ success: true, message: "ลบสาขาสำเร็จ" });
  } catch (err) {
    console.error("❌ Delete branch error:", err);
    res.status(500).json({ success: false, message: "ลบสาขาไม่สำเร็จ" });
  }
});
app.get("/api/user-branches/:username", async (req, res) => {
  try {
    const username = String(req.params.username || "").trim();

    if (!username) return res.json([]);

    const branches = await db
      .collection("user_branches")
      .find({ username })
      .sort({ retailer: 1, store_name_brand: 1 })
      .toArray();

    res.json(branches.map(normalizeBranch));
  } catch (err) {
    console.error("❌ Get user branches by username error:", err);
    res.status(500).json({
      success: false,
      message: "โหลดสาขาผู้ใช้ไม่สำเร็จ",
    });
  }
});
app.post("/api/user-branches/add", async (req, res) => {
  try {
    const { username, branch } = req.body;

    if (!username || !branch) {
      return res.status(400).json({
        success: false,
        message: "ข้อมูลไม่ครบ",
      });
    }

    const exists = await db.collection("user_branches").findOne({
      username: String(username).trim(),
      store_name_brand: branch.store_name_brand || branch.display_name,
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "ผู้ใช้นี้มีสาขานี้แล้ว",
      });
    }

    await db.collection("user_branches").insertOne({
      username: String(username).trim(),
      retailer: branch.retailer || "",
      brand: branch.brand || "",
      store_name: branch.store_name || "",
      store_name_brand: branch.store_name_brand || branch.display_name || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: "เพิ่มสาขาให้ผู้ใช้สำเร็จ",
    });
  } catch (err) {
    console.error("❌ Add user branch error:", err);
    res.status(500).json({
      success: false,
      message: "เพิ่มสาขาไม่สำเร็จ",
    });
  }
});

/* ================= TOGGLE USER BRANCH ================= */
app.post("/api/user-branches/toggle", async (req, res) => {
  try {
    const { userId, branchId } = req.body;

    const user = await db.collection("users").findOne({ id: Number(userId) });

    if (!user) {
      return res.status(404).json({ success: false, message: "ไม่พบผู้ใช้" });
    }

    const branchName = String(branchId || "").trim();

    if (!branchName) {
      return res.status(400).json({ success: false, message: "ไม่พบสาขา" });
    }

    const exists = await db.collection("user_branches").findOne({
      username: user.username,
      store_name_brand: branchName,
    });

    if (exists) {
      await db.collection("user_branches").deleteOne({ _id: exists._id });
      return res.json({ success: true, action: "removed" });
    }

    await db.collection("user_branches").insertOne({
      username: user.username,
      retailer: "",
      brand: "",
      store_name: branchName,
      store_name_brand: branchName,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({ success: true, action: "added" });
  } catch (err) {
    console.error("❌ Toggle user branch error:", err);
    res.status(500).json({ success: false, message: "อัปเดตสาขาไม่สำเร็จ" });
  }
});

/* ================= FILTER OPTIONS FOR REPORT ================= */
app.get("/api/user-filter-options/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    let user = null;

   if (/^\d+$/.test(String(userId))) {
  user = await db.collection("users").findOne({ id: Number(userId) });
} else if (isValidObjectId(String(userId))) {
  user = await db.collection("users").findOne({
    _id: new ObjectId(String(userId)),
  });
} else {
  user = await db.collection("users").findOne({
    username: String(userId).trim(),
  });
}

    if (!user) {
      return res.json({
        users: [],
        groups: [],
        brands: [],
        branches: [],
        options: [],
      });
    }

    const branches = await getBranchesForUser(user);
    const normalized = branches.map(normalizeBranch);

    const groups = [...new Set(normalized.map((b) => b.retailer).filter(Boolean))].sort();
    const brands = [...new Set(normalized.map((b) => b.brand).filter(Boolean))].sort();
    const branchNames = [
      ...new Set(normalized.map((b) => b.display_name).filter(Boolean)),
    ].sort();

    res.json({
      users: [user.username],
      groups,
      brands,
      branches: branchNames,
      options: normalized,
    });
  } catch (err) {
    console.error("❌ user-filter-options error:", err);
    res.status(500).json({
      success: false,
      message: "โหลดตัวกรองไม่สำเร็จ",
    });
  }
});

/* ================= SAVE VISIT ================= */
app.post("/api/save-visit", async (req, res) => {
  try {
    const {
      username,
      user_id,
      visit_date,
      branch_id,
      branch_display_name,
      retailer,
      brand,
      store_name,
      purpose,
      detail,
      solution,
      before_images,
      after_images,
    } = req.body;

    if (!username || !visit_date || !branch_display_name) {
      return res.status(400).json({
        success: false,
        message: "ข้อมูลไม่ครบ",
      });
    }

    const user = await db.collection("users").findOne({
      username: String(username).trim(),
    });

    const lastVisit = await db
      .collection("visits")
      .find({})
      .sort({ id: -1 })
      .limit(1)
      .toArray();

    const nextId = lastVisit.length ? Number(lastVisit[0].id || 0) + 1 : 1;

    const doc = {
      id: nextId,
      username: String(username).trim(),
      user_id: user_id ? Number(user_id) : user?.id ?? null,
      visit_date: String(visit_date).trim(),
      branch_id: branch_id ? Number(branch_id) : null,
      branch_display_name: branch_display_name || "",
      retailer: retailer || "",
      brand: brand || "",
      store_name: store_name || "",
      purpose: purpose || "",
      detail: detail || "",
      solution: solution || "",
      before_images: Array.isArray(before_images) ? before_images : [],
      after_images: Array.isArray(after_images) ? after_images : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("visits").insertOne(doc);

    res.json({
      success: true,
      message: "บันทึกข้อมูลสำเร็จ",
    });
  } catch (err) {
    console.error("❌ save-visit error:", err);
    res.status(500).json({
      success: false,
      message: "บันทึกข้อมูลไม่สำเร็จ",
    });
  }
});

/* ================= WORK LOG / REPORT ================= */
app.get("/api/work_log", async (req, res) => {
  try {
    const { username, group, brand, branch } = req.query;

    const query = {};

    if (username && username !== "ทั้งหมด") {
      query.username = String(username).trim();
    }

    if (group && group !== "ทั้งหมด") {
      query.retailer = String(group).trim();
    }

    if (brand && brand !== "ทั้งหมด") {
      query.brand = String(brand).trim();
    }

    if (branch && branch !== "ทั้งหมด") {
      query.branch_display_name = String(branch).trim();
    }

    const visits = await db
      .collection("visits")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json(visits.map(normalizeVisit));
  } catch (err) {
    console.error("❌ work_log error:", err);
    res.status(500).json({
      success: false,
      message: "โหลดรายงานไม่สำเร็จ",
    });
  }
});

/* ================= DELETE WORK LOG ================= */
app.delete("/api/work_log/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let result = null;

    if (/^\d+$/.test(String(id))) {
      result = await db.collection("visits").deleteOne({ id: Number(id) });
    } else if (isValidObjectId(String(id))) {
      result = await db.collection("visits").deleteOne({
        _id: new ObjectId(String(id)),
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "id ไม่ถูกต้อง",
      });
    }

    if (!result.deletedCount) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลที่ต้องการลบ",
      });
    }

    res.json({
      success: true,
      message: "ลบรายงานสำเร็จ",
    });
  } catch (err) {
    console.error("❌ Delete work_log error:", err);
    res.status(500).json({
      success: false,
      message: "ลบรายงานไม่สำเร็จ",
    });
  }
});

/* ================= START ================= */
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});