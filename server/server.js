const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// ================== CORS (แก้ปัญหามือถือ) ==================
const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://loginfirebacse2766.web.app",
  "https://loginfirebacse2766.firebaseapp.com",
  "http://localhost:5173"
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

// ================== Middleware ==================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// ================== Database ==================
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "kanokwan"
});

db.connect((err) => {
  if (err) {
    console.error("❌ DB Error:", err);
  } else {
    console.log("✅ Connected to MySQL");
  }
});

// ================== Routes ==================

// 🔐 LOGIN
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
  db.query(sql, [username, password], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length > 0) {
      res.json({ success: true, user: result[0] });
    } else {
      res.status(401).json({ success: false, message: "Invalid login" });
    }
  });
});

// 📥 CREATE VISIT
app.post("/api/visits", (req, res) => {
  const data = req.body;

  const sql = `
    INSERT INTO visits 
    (name, phone, company, note)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sql,
    [data.name, data.phone, data.company, data.note],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({ success: true, id: result.insertId });
    }
  );
});

// 📤 GET VISITS
app.get("/api/visits", (req, res) => {
  const sql = "SELECT * FROM visits ORDER BY id DESC";

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);

    res.json(result);
  });
});

// ================== Start Server ==================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});