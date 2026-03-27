require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./db");
const path = require("path");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ success: true, message: "API is running" });
});

// ================= LOGIN =================
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password]
    );

    if (rows.length > 0) {
      res.json({ success: true, user: rows[0] });
    } else {
      res.status(401).json({ success: false, message: "Invalid login" });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================= USERS =================
app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users ORDER BY id DESC");
    res.json(rows);
  } catch (error) {
    console.error("Users Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();
    const cleanRole = String(role || "user").trim().toLowerCase();

    const [dup] = await db.query(
      "SELECT id FROM users WHERE username = ? LIMIT 1",
      [cleanUsername]
    );

    if (dup.length > 0) {
      return res.status(409).json({ error: "มีชื่อผู้ใช้นี้อยู่แล้ว" });
    }

    const [result] = await db.query(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [cleanUsername, cleanPassword, cleanRole]
    );

    res.json({
      success: true,
      id: result.insertId,
      message: "เพิ่มพนักงานสำเร็จ",
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role } = req.body;

    if (!username) {
      return res.status(400).json({ error: "ชื่อผู้ใช้ห้ามว่าง" });
    }

    const cleanUsername = String(username).trim();
    const cleanRole = String(role || "user").trim().toLowerCase();

    const [dup] = await db.query(
      "SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1",
      [cleanUsername, id]
    );

    if (dup.length > 0) {
      return res.status(409).json({ error: "มีชื่อผู้ใช้นี้อยู่แล้ว" });
    }

    if (password && String(password).trim() !== "") {
      await db.query(
        "UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?",
        [cleanUsername, String(password).trim(), cleanRole, id]
      );
    } else {
      await db.query(
        "UPDATE users SET username = ?, role = ? WHERE id = ?",
        [cleanUsername, cleanRole, id]
      );
    }

    if (cleanRole === "admin") {
      await db.query("DELETE FROM user_branches WHERE user_id = ?", [id]);
    }

    res.json({ success: true, message: "อัปเดตผู้ใช้สำเร็จ" });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM user_branches WHERE user_id = ?", [id]);
    await db.query("DELETE FROM work_log WHERE user_id = ?", [id]);
    const [result] = await db.query("DELETE FROM users WHERE id = ?", [id]);

    res.json({
      success: true,
      affectedRows: result.affectedRows,
      message: "ลบผู้ใช้สำเร็จ",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================= BRANCHES =================
app.get("/api/branches", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM branches ORDER BY id ASC");
    res.json(rows);
  } catch (error) {
    console.error("Branches Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/branches", async (req, res) => {
  try {
    const { display_name, branch_name, retailer, brand, store_name, name } = req.body;

    const finalDisplay = String(display_name || name || "").trim();
    const finalBranchName = String(branch_name || display_name || name || "").trim();

    if (!finalDisplay) {
      return res.status(400).json({ error: "ชื่อสาขาห้ามว่าง" });
    }

    const [dup] = await db.query(
      "SELECT * FROM branches WHERE display_name = ? LIMIT 1",
      [finalDisplay]
    );

    if (dup.length > 0) {
      return res.json(dup[0]);
    }

    const [maxRows] = await db.query(
      "SELECT COALESCE(MAX(id), 0) AS maxId FROM branches"
    );
    const nextId = Number(maxRows?.[0]?.maxId || 0) + 1;

    await db.query(
      `
      INSERT INTO branches (id, branch_name, retailer, brand, store_name, display_name)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        nextId,
        finalBranchName,
        retailer || null,
        brand || null,
        store_name || null,
        finalDisplay,
      ]
    );

    const [rows] = await db.query(
      "SELECT * FROM branches WHERE id = ? LIMIT 1",
      [nextId]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error("Create branch error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/branches/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { display_name, branch_name, retailer, brand, store_name, name } = req.body;

    const finalDisplay = String(display_name || name || "").trim();
    const finalBranchName = String(branch_name || display_name || name || "").trim();

    if (!finalDisplay) {
      return res.status(400).json({ error: "ชื่อสาขาห้ามว่าง" });
    }

    const [exists] = await db.query(
      "SELECT * FROM branches WHERE id = ? LIMIT 1",
      [id]
    );

    if (exists.length === 0) {
      return res.status(404).json({ error: "ไม่พบสาขา" });
    }

    const [dup] = await db.query(
      "SELECT * FROM branches WHERE display_name = ? AND id <> ? LIMIT 1",
      [finalDisplay, id]
    );

    if (dup.length > 0) {
      return res.status(400).json({ error: "มีชื่อสาขานี้อยู่แล้ว" });
    }

    await db.query(
      `
      UPDATE branches
      SET branch_name = ?, retailer = ?, brand = ?, store_name = ?, display_name = ?
      WHERE id = ?
      `,
      [
        finalBranchName,
        retailer || null,
        brand || null,
        store_name || null,
        finalDisplay,
        id,
      ]
    );

    const [rows] = await db.query(
      "SELECT * FROM branches WHERE id = ? LIMIT 1",
      [id]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error("Update branch error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/branches/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [exists] = await db.query(
      "SELECT * FROM branches WHERE id = ? LIMIT 1",
      [id]
    );

    if (exists.length === 0) {
      return res.status(404).json({ error: "ไม่พบสาขา" });
    }

    await db.query("DELETE FROM user_branches WHERE branch_id = ?", [id]);
    await db.query("DELETE FROM branches WHERE id = ?", [id]);

    res.json({ success: true, message: "ลบสาขาสำเร็จ" });
  } catch (error) {
    console.error("Delete branch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================= USER BRANCHES =================
app.get("/api/user-branches-list/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `
      SELECT b.*
      FROM user_branches ub
      INNER JOIN branches b ON ub.branch_id = b.id
      WHERE ub.user_id = ?
      ORDER BY b.id ASC
      `,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error("User branches list error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/user-branches/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `
      SELECT b.*
      FROM user_branches ub
      INNER JOIN branches b ON ub.branch_id = b.id
      WHERE ub.user_id = ?
      ORDER BY b.id ASC
      `,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error("User branches error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/user-branches/toggle", async (req, res) => {
  try {
    const { userId, branchId } = req.body;

    if (!userId || !branchId) {
      return res.status(400).json({ error: "missing data" });
    }

    const [userRows] = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    }

    const user = userRows[0];
    if (String(user.role || "").toLowerCase() === "admin") {
      return res.status(400).json({ error: "ผู้ดูแลระบบไม่สามารถมีสาขาได้" });
    }

    const [exists] = await db.query(
      "SELECT id FROM user_branches WHERE user_id = ? AND branch_id = ? LIMIT 1",
      [userId, branchId]
    );

    if (exists.length > 0) {
      await db.query(
        "DELETE FROM user_branches WHERE user_id = ? AND branch_id = ?",
        [userId, branchId]
      );
      return res.json({ success: true, action: "removed" });
    }

    await db.query(
      "INSERT INTO user_branches (user_id, branch_id) VALUES (?, ?)",
      [userId, branchId]
    );

    res.json({ success: true, action: "added" });
  } catch (error) {
    console.error("Toggle user branch error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/user-filter-options/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `
      SELECT DISTINCT
        b.id,
        b.retailer,
        b.brand,
        b.branch_name,
        b.display_name
      FROM user_branches ub
      INNER JOIN branches b ON ub.branch_id = b.id
      WHERE ub.user_id = ?
      ORDER BY b.retailer ASC, b.brand ASC, b.display_name ASC
      `,
      [userId]
    );

    res.json(Array.isArray(rows) ? rows : []);
  } catch (error) {
    console.error("User filter options error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================= SAVE VISIT =================
app.post("/api/save-visit", async (req, res) => {
  const {
    userId,
    workplace,
    description,
    issue_text,
    resolution_text,
    work_date,
    before_images,
    after_images,
  } = req.body;

  try {
    let retailer = "";
    let brand = "";
    let branchId = null;

    if (workplace) {
      const [branchRows] = await db.query(
        `
        SELECT id, retailer, brand, display_name, branch_name
        FROM branches
        WHERE display_name = ? OR branch_name = ?
        LIMIT 1
        `,
        [workplace, workplace]
      );

      if (branchRows.length > 0) {
        branchId = branchRows[0].id;
        retailer = branchRows[0].retailer || "";
        brand = branchRows[0].brand || "";
      }
    }

    const [result] = await db.query(
      `INSERT INTO work_log
      (user_id, branch_id, workplace, description, issue_text, resolution_text, work_date, before_images, after_images, retailer, brand)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        branchId,
        workplace,
        description,
        issue_text,
        resolution_text,
        work_date,
        JSON.stringify(before_images || []),
        JSON.stringify(after_images || []),
        retailer,
        brand,
      ]
    );

    res.json({
      success: true,
      message: "บันทึกข้อมูลและรูปภาพสำเร็จ!",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Save Visit Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================= WORK LOG =================
app.get("/api/work_log", async (req, res) => {
  try {
    const [logs] = await db.query(`
      SELECT
        wl.*,
        u.username,
        b.display_name,
        b.branch_name
      FROM work_log wl
      LEFT JOIN users u ON wl.user_id = u.id
      LEFT JOIN branches b ON wl.branch_id = b.id
      ORDER BY wl.work_date DESC, wl.id DESC
    `);

    res.json(logs);
  } catch (error) {
    console.error("Work log Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/work_log/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM work_log WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================= REBUILD USER BRANCHES =================
app.get("/api/rebuild-user-branches", async (req, res) => {
  try {
    await db.query("DELETE FROM user_branches");

    await db.query(`
      INSERT INTO user_branches (user_id, branch_id)
      SELECT DISTINCT
        u.id AS user_id,
        b.id AS branch_id
      FROM store_assignments sa
      INNER JOIN users u ON u.username = sa.username
      INNER JOIN branches b ON b.display_name = sa.store_name_brand
      WHERE sa.username IS NOT NULL
        AND TRIM(sa.username) <> ''
        AND LOWER(sa.username) <> 'admin'
        AND (u.role IS NULL OR LOWER(u.role) <> 'admin')
      ORDER BY u.id, b.id
    `);

    res.json({ success: true, message: "user_branches rebuilt" });
  } catch (error) {
    console.error("Rebuild user_branches error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================= SETUP ALL =================
app.get("/api/setup-all", async (req, res) => {
  return res.status(403).json({
    success: false,
    message: "setup-all ถูกปิดไว้เพื่อป้องกันข้อมูลหาย",
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});