require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./db");
const path = require("path");

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://loginfirebase2766.web.app",
  "https://loginfirebase2766.firebaseapp.com",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ success: true, message: "API is running" });
});

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

app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users ORDER BY id DESC");
    res.json(rows);
  } catch (error) {
    console.error("Users Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/branches", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM branches");
    res.json(rows);
  } catch (error) {
    console.error("Branches Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/user-branches-list/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `
      SELECT b.*
      FROM user_branches ub
      INNER JOIN branches b ON ub.branch_id = b.id
      WHERE ub.user_id = ?
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
      `,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error("User branches error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/user-filter-options/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `
      SELECT 
        b.id,
        b.retailer,
        b.brand,
        b.display_name
      FROM user_branches ub
      INNER JOIN branches b ON ub.branch_id = b.id
      WHERE ub.user_id = ?
      `,
      [userId]
    );

    res.json(Array.isArray(rows) ? rows : []);
  } catch (error) {
    console.error("User filter options error:", error);
    res.status(500).json({ error: error.message });
  }
});

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
    const [result] = await db.query(
      `INSERT INTO work_log
      (user_id, workplace, description, issue_text, resolution_text, work_date, before_images, after_images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        workplace,
        description,
        issue_text,
        resolution_text,
        work_date,
        JSON.stringify(before_images || []),
        JSON.stringify(after_images || []),
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

app.get("/api/work_log", async (req, res) => {
  try {
    const [logs] = await db.query(`
      SELECT
        wl.*,
        u.username
      FROM work_log wl
      LEFT JOIN users u ON wl.user_id = u.id
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
    await db.query("DELETE FROM work_log WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
// trigger deploy