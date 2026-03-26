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
   const [rows] = await db.query(
  "SELECT * FROM users WHERE username = ? AND password = ? ORDER BY id DESC LIMIT 1",
  [username, password]
);
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/fix-user-branches", async (req, res) => {
  try {
    await db.query("UPDATE user_branches SET user_id = 8 WHERE user_id = 7");
    await db.query("UPDATE user_branches SET user_id = 9 WHERE user_id = 8");

    res.json({ success: true, message: "user_branches fixed" });
  } catch (error) {
    console.error("Fix error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
app.get("/api/setup-all", async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // ===== 1) branches =====
    await connection.query(`DROP TABLE IF EXISTS user_branches`);
    await connection.query(`DROP TABLE IF EXISTS store_assignments`);
    await connection.query(`DROP TABLE IF EXISTS work_log`);
    await connection.query(`DROP TABLE IF EXISTS visits`);
    await connection.query(`DROP TABLE IF EXISTS branches`);

    await connection.query(`
      CREATE TABLE branches (
        id INT(11) NOT NULL,
        branch_name VARCHAR(150) NOT NULL,
        retailer VARCHAR(100) DEFAULT NULL,
        brand VARCHAR(100) DEFAULT NULL,
        store_name VARCHAR(255) DEFAULT NULL,
        display_name VARCHAR(255) DEFAULT NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    `);

    await connection.query(`
      INSERT INTO branches (id, branch_name, retailer, brand, store_name, display_name) VALUES
      (1, 'CENTRAL - Bang Rak', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Bang Rak (Akemi)'),
      (2, 'CENTRAL - Fashion Island', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Fashion Island (Akemi)'),
      (3, 'CENTRAL - Khon Kaen', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Khon Kaen (Akemi)'),
      (4, 'ROBINSON - Srinakarin', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Srinakarin (Akemi)'),
      (5, 'ROBINSON - Chiang Mai', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Chiang Mai (Akemi)'),
      (6, 'ROBINSON - Ayutthaya', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Ayutthaya (Akemi)'),
      (7, 'ROBINSON - Chachoengsao', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Chachoengsao (Akemi)'),
      (8, 'ROBINSON - Rangsit', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Rangsit (Akemi)'),
      (9, 'ROBINSON - Sukhumvit', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Sukhumvit (Akemi)'),
      (10, 'ROBINSON - Srisaman', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Srisaman (Akemi)'),
      (11, 'ROBINSON - Chiang Rai', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Chiang Rai (Akemi)'),
      (12, 'ROBINSON - Ubon Ratchathani', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Ubon Ratchathani (Akemi)'),
      (13, 'ROBINSON - Prachin Buri', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Prachin Buri (Akemi)'),
      (14, 'ROBINSON - Suvarnabhumi', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Suvarnabhumi (Akemi)'),
      (15, 'ROBINSON - Rayong', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Rayong (Akemi)'),
      (16, 'ROBINSON - Chanthaburi', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Chanthaburi (Akemi)'),
      (17, 'ROBINSON - Thalang', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Thalang (Akemi)'),
      (18, 'ROBINSON - Ratchaphruek', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Ratchaphruek (Akemi)'),
      (19, 'ROBINSON - Phitsanulok', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Phitsanulok (Akemi)'),
      (20, 'ROBINSON - Chon Buri', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Chon Buri (Akemi)'),
      (21, 'ROBINSON - Mukdahan', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Mukdahan (Akemi)'),
      (22, 'ROBINSON - Mahachai', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Mahachai (Akemi)'),
      (23, 'ROBINSON - Hat Yai', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Hat Yai (Akemi)'),
      (24, 'ROBINSON - Roi Et', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Roi Et (Akemi)'),
      (25, 'ROBINSON - Chalong', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Chalong (Akemi)'),
      (26, 'ROBINSON - Mae Sot', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Mae Sot (Akemi)'),
      (27, 'ROBINSON - Kamphaeng Phet', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Kamphaeng Phet (Akemi)'),
      (28, 'ROBINSON - Lopburi', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Lopburi (Akemi)'),
      (29, 'ROBINSON - Surin', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Surin (Akemi)'),
      (30, 'ROBINSON - Buri Ram', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Buri Ram (Akemi)'),
      (31, 'ROBINSON - Nakhon Si Thammarat 2', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Nakhon Si Thammarat 2 (Akemi)'),
      (32, 'ROBINSON - Lampang', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Lampang (Akemi)'),
      (33, 'ROBINSON - Sakhon Nakhon', 'ROBINSON', 'Akemi', NULL, 'ROBINSON - Sakhon Nakhon (Akemi)'),
      (34, 'CENTRAL - Rama 9', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Rama 9 (Akemi)'),
      (35, 'BIG C - Rajdamri', 'BIG C', 'Studio One', NULL, 'BIG C - Rajdamri (Studio One)'),
      (36, 'BIG C - Pattaya 2', 'BIG C', 'Studio One', NULL, 'BIG C - Pattaya 2 (Studio One)'),
      (37, 'BIG C - Ratchadaphisek', 'BIG C', 'Studio One', NULL, 'BIG C - Ratchadaphisek (Studio One)'),
      (38, 'BIG C - Pattaya 3', 'BIG C', 'Studio One', NULL, 'BIG C - Pattaya 3 (Studio One)'),
      (39, 'BIG C - Chiang Mai 2', 'BIG C', 'Studio One', NULL, 'BIG C - Chiang Mai 2 (Studio One)'),
      (40, 'BIG C - Mega Bangna', 'BIG C', 'Studio One', NULL, 'BIG C - Mega Bangna (Studio One)'),
      (41, 'BIG C - Rama 4', 'BIG C', 'Studio One', NULL, 'BIG C - Rama 4 (Studio One)'),
      (42, 'BIG C - Suksawat', 'BIG C', 'Studio One', NULL, 'BIG C - Suksawat (Studio One)'),
      (43, 'BIG C - On Nut', 'BIG C', 'Studio One', NULL, 'BIG C - On Nut (Studio One)'),
      (44, 'BIG C - Itsaraphap', 'BIG C', 'Studio One', NULL, 'BIG C - Itsaraphap (Studio One)'),
      (45, 'BIG C - Chiang Mai', 'BIG C', 'Studio One', NULL, 'BIG C - Chiang Mai (Studio One)'),
      (46, 'BIG C - Hat Yai 2', 'BIG C', 'Studio One', NULL, 'BIG C - Hat Yai 2 (Studio One)'),
      (47, 'BIG C - Hua Mak', 'BIG C', 'Studio One', NULL, 'BIG C - Hua Mak (Studio One)'),
      (48, 'BIG C - Ekamai', 'BIG C', 'Studio One', NULL, 'BIG C - Ekamai (Studio One)'),
      (49, 'BIG C - Tiwanon', 'BIG C', 'Studio One', NULL, 'BIG C - Tiwanon (Studio One)'),
      (50, 'BIG C - Rangsit', 'BIG C', 'Studio One', NULL, 'BIG C - Rangsit (Studio One)'),
      (51, 'BIG C - Hat Yai', 'BIG C', 'Studio One', NULL, 'BIG C - Hat Yai (Studio One)'),
      (52, 'BIG C - Rattanathibet 2', 'BIG C', 'Studio One', NULL, 'BIG C - Rattanathibet 2 (Studio One)'),
      (53, 'BIG C - Lat Phrao', 'BIG C', 'Studio One', NULL, 'BIG C - Lat Phrao (Studio One)'),
      (54, 'BIG C - Bang Na', 'BIG C', 'Studio One', NULL, 'BIG C - Bang Na (Studio One)'),
      (55, 'BIG C - Su-ngai Kolok', 'BIG C', 'Studio One', NULL, 'BIG C - Su-ngai Kolok (Studio One)'),
      (56, 'BIG C - Pattani', 'BIG C', 'Studio One', NULL, 'BIG C - Pattani (Studio One)'),
      (57, 'BIG C - Chaengwattana', 'BIG C', 'Studio One', NULL, 'BIG C - Chaengwattana (Studio One)'),
      (58, 'BIG C - Phitsanulok', 'BIG C', 'Studio One', NULL, 'BIG C - Phitsanulok (Studio One)'),
      (59, 'BIG C - Lam Luk Ka Klong 4', 'BIG C', 'Studio One', NULL, 'BIG C - Lam Luk Ka Klong 4 (Studio One)'),
      (60, 'BIG C - Wong Sawang', 'BIG C', 'Studio One', NULL, 'BIG C - Wong Sawang (Studio One)'),
      (61, 'BIG C - Ubon Ratchathani', 'BIG C', 'Studio One', NULL, 'BIG C - Ubon Ratchathani (Studio One)'),
      (62, 'BIG C - Mahachai', 'BIG C', 'Studio One', NULL, 'BIG C - Mahachai (Studio One)'),
      (63, 'BIG C - Yala', 'BIG C', 'Studio One', NULL, 'BIG C - Yala (Studio One)'),
      (64, 'LOTUS - Pattaya South', 'LOTUS', 'Studio One', NULL, 'LOTUS - Pattaya South (Studio One)'),
      (65, 'LOTUS - Laksi', 'LOTUS', 'Studio One', NULL, 'LOTUS - Laksi (Studio One)'),
      (66, 'LOTUS - Phitsanulok', 'LOTUS', 'Studio One', NULL, 'LOTUS - Phitsanulok (Studio One)'),
      (67, 'HOMEPRO - Ekamai-Ramintra', 'HOMEPRO', 'Akemi', NULL, 'HOMEPRO - Ekamai-Ramintra (Akemi)'),
      (68, 'INDEX LIVING MALL - Kaset-Nawamin', 'INDEX LIVING MALL', 'Akemi', NULL, 'INDEX LIVING MALL - Kaset-Nawamin (Akemi)'),
      (69, 'INDEX LIVING MALL - Udon Thani', 'INDEX LIVING MALL', 'Akemi', NULL, 'INDEX LIVING MALL - Udon Thani (Akemi)'),
      (70, 'INDEX LIVING MALL - Bang Na', 'INDEX LIVING MALL', 'Akemi', NULL, 'INDEX LIVING MALL - Bang Na (Akemi)'),
      (71, 'INDEX LIVING MALL - Pattaya 2', 'INDEX LIVING MALL', 'Akemi', NULL, 'INDEX LIVING MALL - Pattaya 2 (Akemi)'),
      (72, 'INDEX LIVING MALL - Chiang Mai', 'INDEX LIVING MALL', 'Akemi', NULL, 'INDEX LIVING MALL - Chiang Mai (Akemi)'),
      (73, 'INDEX LIVING MALL - Phuket', 'INDEX LIVING MALL', 'Akemi', NULL, 'INDEX LIVING MALL - Phuket (Akemi)'),
      (74, 'INDEX LIVING MALL - Rangsit', 'INDEX LIVING MALL', 'Akemi', NULL, 'INDEX LIVING MALL - Rangsit (Akemi)'),
      (75, 'INDEX LIVING MALL - Rama 2', 'INDEX LIVING MALL', 'Akemi', NULL, 'INDEX LIVING MALL - Rama 2 (Akemi)'),
      (76, 'INDEX LIVING MALL - Hat Yai', 'INDEX LIVING MALL', 'Akemi', NULL, 'INDEX LIVING MALL - Hat Yai (Akemi)'),
      (77, 'INDEX LIVING MALL - Ratchaphruek', 'INDEX LIVING MALL', 'Akemi', NULL, 'INDEX LIVING MALL - Ratchaphruek (Akemi)'),
      (78, 'INDEX LIVING MALL - Chiang Rai', 'INDEX LIVING MALL', 'Akemi', NULL, 'INDEX LIVING MALL - Chiang Rai (Akemi)'),
      (79, 'SB DESIGN SQUARE - Ratchaphruek', 'SB DESIGN SQUARE', 'Akemi', NULL, 'SB DESIGN SQUARE - Ratchaphruek (Akemi)'),
      (80, 'SB DESIGN SQUARE - Bang Na', 'SB DESIGN SQUARE', 'Akemi', NULL, 'SB DESIGN SQUARE - Bang Na (Akemi)'),
      (81, 'SB DESIGN SQUARE - Bang Khae', 'SB DESIGN SQUARE', 'Akemi', NULL, 'SB DESIGN SQUARE - Bang Khae (Akemi)'),
      (82, 'SB DESIGN SQUARE - Rama 2', 'SB DESIGN SQUARE', 'Akemi', NULL, 'SB DESIGN SQUARE - Rama 2 (Akemi)'),
      (83, 'SIAM TAKASHIMAYA - Icon Siam', 'SIAM TAKASHIMAYA', 'Akemi', NULL, 'SIAM TAKASHIMAYA - Icon Siam (Akemi)'),
      (84, 'SIAM TAKASHIMAYA - Icon Siam (Cannon)', 'SIAM TAKASHIMAYA', 'Cannon', NULL, 'SIAM TAKASHIMAYA - Icon Siam (Cannon)'),
      (85, 'INDEX LIVING MALL - Ubon Ratchathani 2', 'INDEX LIVING MALL', 'Akemi', NULL, 'INDEX LIVING MALL - Ubon Ratchathani 2 (Akemi)'),
      (86, 'CENTRAL - Bang Na', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Bang Na (Akemi)'),
      (87, 'CENTRAL - Bang Na (Cannon)', 'CENTRAL', 'Cannon', NULL, 'CENTRAL - Bang Na (Cannon)'),
      (88, 'CENTRAL - Chaengwattana', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Chaengwattana (Akemi)'),
      (89, 'CENTRAL - Chaengwattana (Cannon)', 'CENTRAL', 'Cannon', NULL, 'CENTRAL - Chaengwattana (Cannon)'),
      (90, 'CENTRAL - Chiang Mai', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Chiang Mai (Akemi)'),
      (91, 'CENTRAL - Chiang Mai (Cannon)', 'CENTRAL', 'Cannon', NULL, 'CENTRAL - Chiang Mai (Cannon)'),
      (92, 'CENTRAL - Chidlom', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Chidlom (Akemi)'),
      (93, 'CENTRAL - Chidlom (Cannon)', 'CENTRAL', 'Cannon', NULL, 'CENTRAL - Chidlom (Cannon)'),
      (94, 'CENTRAL - East Ville', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - East Ville (Akemi)'),
      (95, 'CENTRAL - East Ville (Cannon)', 'CENTRAL', 'Cannon', NULL, 'CENTRAL - East Ville (Cannon)'),
      (96, 'CENTRAL - Hat Yai Kanchana', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Hat Yai Kanchana (Akemi)'),
      (97, 'CENTRAL - Hat Yai Kanchana (Cannon)', 'CENTRAL', 'Cannon', NULL, 'CENTRAL - Hat Yai Kanchana (Cannon)'),
      (98, 'CENTRAL - Korat', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Korat (Akemi)'),
      (99, 'CENTRAL - Lat Phrao', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Lat Phrao (Akemi)'),
      (100, 'CENTRAL - Lat Phrao (Cannon)', 'CENTRAL', 'Cannon', NULL, 'CENTRAL - Lat Phrao (Cannon)'),
      (101, 'CENTRAL - Mega Bangna', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Mega Bangna (Akemi)'),
      (102, 'CENTRAL - Nakhon Pathom', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Nakhon Pathom (Akemi)'),
      (103, 'CENTRAL - Nakhon Sawan', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Nakhon Sawan (Akemi)'),
      (104, 'CENTRAL - Pattaya', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Pattaya (Akemi)'),
      (105, 'CENTRAL - Pattaya (Cannon)', 'CENTRAL', 'Cannon', NULL, 'CENTRAL - Pattaya (Cannon)'),
      (106, 'CENTRAL - Phuket', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Phuket (Akemi)'),
      (107, 'CENTRAL - Pinklao', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Pinklao (Akemi)'),
      (108, 'CENTRAL - Pinklao (Cannon)', 'CENTRAL', 'Cannon', NULL, 'CENTRAL - Pinklao (Cannon)'),
      (109, 'CENTRAL - Ram Intra', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Ram Intra (Akemi)'),
      (110, 'CENTRAL - Rama 2', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Rama 2 (Akemi)'),
      (111, 'CENTRAL - Rama 3', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Rama 3 (Akemi)'),
      (112, 'CENTRAL - Rama 3 (Cannon)', 'CENTRAL', 'Cannon', NULL, 'CENTRAL - Rama 3 (Cannon)'),
      (113, 'CENTRAL - Rangsit', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Rangsit (Akemi)'),
      (114, 'CENTRAL - Rangsit (Cannon)', 'CENTRAL', 'Cannon', NULL, 'CENTRAL - Rangsit (Cannon)'),
      (115, 'CENTRAL - Salaya', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Salaya (Akemi)'),
      (116, 'CENTRAL - Silom', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Silom (Akemi)'),
      (117, 'CENTRAL - Udon Thani', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Udon Thani (Akemi)'),
      (118, 'CENTRAL - Westgate', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Westgate (Akemi)'),
      (119, 'CENTRAL - Westville', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Westville (Akemi)'),
      (120, 'CENTRAL - Zen World', 'CENTRAL', 'Akemi', NULL, 'CENTRAL - Zen World (Akemi)'),
      (121, 'CENTRAL - Zen World (Cannon)', 'CENTRAL', 'Cannon', NULL, 'CENTRAL - Zen World (Cannon)'),
      (122, 'THE MALL - Paragon', 'THE MALL', 'Akemi', NULL, 'THE MALL - Paragon (Akemi)'),
      (123, 'THE MALL - Emporium', 'THE MALL', 'Akemi', NULL, 'THE MALL - Emporium (Akemi)'),
      (124, 'THE MALL - Emporium (Cannon)', 'THE MALL', 'Cannon', NULL, 'THE MALL - Emporium (Cannon)'),
      (125, 'THE MALL - Bang Kapi', 'THE MALL', 'Akemi', NULL, 'THE MALL - Bang Kapi (Akemi)'),
      (126, 'THE MALL - Bang Kapi (Cannon)', 'THE MALL', 'Cannon', NULL, 'THE MALL - Bang Kapi (Cannon)'),
      (127, 'THE MALL - Bang Khae', 'THE MALL', 'Akemi', NULL, 'THE MALL - Bang Khae (Akemi)'),
      (128, 'THE MALL - Bang Khae (Cannon)', 'THE MALL', 'Cannon', NULL, 'THE MALL - Bang Khae (Cannon)'),
      (129, 'THE MALL - Tha-Pra', 'THE MALL', 'Akemi', NULL, 'THE MALL - Tha-Pra (Akemi)'),
      (130, 'THE MALL - Ngam Wong Wan', 'THE MALL', 'Akemi', NULL, 'THE MALL - Ngam Wong Wan (Akemi)'),
      (131, 'THE MALL - Ngam Wong Wan (Cannon)', 'THE MALL', 'Cannon', NULL, 'THE MALL - Ngam Wong Wan (Cannon)'),
      (132, 'THE MALL - Korat', 'THE MALL', 'Akemi', NULL, 'THE MALL - Korat (Akemi)'),
      (133, 'THE MALL - Paragon (Towel)', 'THE MALL', 'Towel', NULL, 'THE MALL - Paragon (Towel)'),
      (134, 'THE MALL - Emporium (Towel)', 'THE MALL', 'Towel', NULL, 'THE MALL - Emporium (Towel)'),
      (135, 'THE MALL - Bang Kapi (Towel)', 'THE MALL', 'Towel', NULL, 'THE MALL - Bang Kapi (Towel)'),
      (136, 'THE MALL - Bang Khae (Towel)', 'THE MALL', 'Towel', NULL, 'THE MALL - Bang Khae (Towel)'),
      (137, 'THE MALL - Ngam Wong Wan (Towel)', 'THE MALL', 'Towel', NULL, 'THE MALL - Ngam Wong Wan (Towel)')
    `);

    // ===== 2) store_assignments =====
    await connection.query(`
      CREATE TABLE store_assignments (
        id INT(11) NOT NULL AUTO_INCREMENT,
        retailer VARCHAR(100) DEFAULT NULL,
        brand VARCHAR(100) DEFAULT NULL,
        store_name VARCHAR(150) DEFAULT NULL,
        store_name_brand VARCHAR(200) DEFAULT NULL,
        username VARCHAR(100) DEFAULT NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    `);

    await connection.query(`
      INSERT INTO store_assignments (id, retailer, brand, store_name, store_name_brand, username) VALUES
      (1, 'CENTRAL', 'Akemi', 'CENTRAL - Bang Rak', 'CENTRAL - Bang Rak (Akemi)', 'kongkrit'),
      (2, 'CENTRAL', 'Akemi', 'CENTRAL - Fashion Island', 'CENTRAL - Fashion Island (Akemi)', 'kongkrit'),
      (3, 'CENTRAL', 'Akemi', 'CENTRAL - Khon Kaen', 'CENTRAL - Khon Kaen (Akemi)', 'kongkrit'),
      (4, 'ROBINSON', 'Akemi', 'ROBINSON - Srinakarin', 'ROBINSON - Srinakarin (Akemi)', 'kongkrit'),
      (5, 'ROBINSON', 'Akemi', 'ROBINSON - Chiang Mai', 'ROBINSON - Chiang Mai (Akemi)', 'kongkrit'),
      (6, 'ROBINSON', 'Akemi', 'ROBINSON - Ayutthaya', 'ROBINSON - Ayutthaya (Akemi)', 'kongkrit'),
      (7, 'ROBINSON', 'Akemi', 'ROBINSON - Chachoengsao', 'ROBINSON - Chachoengsao (Akemi)', 'kongkrit'),
      (8, 'ROBINSON', 'Akemi', 'ROBINSON - Rangsit', 'ROBINSON - Rangsit (Akemi)', 'kongkrit'),
      (9, 'ROBINSON', 'Akemi', 'ROBINSON - Sukhumvit', 'ROBINSON - Sukhumvit (Akemi)', 'kongkrit'),
      (10, 'ROBINSON', 'Akemi', 'ROBINSON - Srisaman', 'ROBINSON - Srisaman (Akemi)', 'kongkrit'),
      (11, 'ROBINSON', 'Akemi', 'ROBINSON - Chiang Rai', 'ROBINSON - Chiang Rai (Akemi)', 'kongkrit'),
      (12, 'ROBINSON', 'Akemi', 'ROBINSON - Ubon Ratchathani', 'ROBINSON - Ubon Ratchathani (Akemi)', 'kongkrit'),
      (13, 'ROBINSON', 'Akemi', 'ROBINSON - Prachin Buri', 'ROBINSON - Prachin Buri (Akemi)', 'kongkrit'),
      (14, 'ROBINSON', 'Akemi', 'ROBINSON - Suvarnabhumi', 'ROBINSON - Suvarnabhumi (Akemi)', 'kongkrit'),
      (15, 'ROBINSON', 'Akemi', 'ROBINSON - Rayong', 'ROBINSON - Rayong (Akemi)', 'kongkrit'),
      (16, 'ROBINSON', 'Akemi', 'ROBINSON - Chanthaburi', 'ROBINSON - Chanthaburi (Akemi)', 'kongkrit'),
      (17, 'ROBINSON', 'Akemi', 'ROBINSON - Thalang', 'ROBINSON - Thalang (Akemi)', 'kongkrit'),
      (18, 'ROBINSON', 'Akemi', 'ROBINSON - Ratchaphruek', 'ROBINSON - Ratchaphruek (Akemi)', 'kongkrit'),
      (19, 'ROBINSON', 'Akemi', 'ROBINSON - Phitsanulok', 'ROBINSON - Phitsanulok (Akemi)', 'kongkrit'),
      (20, 'ROBINSON', 'Akemi', 'ROBINSON - Chon Buri', 'ROBINSON - Chon Buri (Akemi)', 'kongkrit'),
      (21, 'ROBINSON', 'Akemi', 'ROBINSON - Mukdahan', 'ROBINSON - Mukdahan (Akemi)', 'kongkrit'),
      (22, 'ROBINSON', 'Akemi', 'ROBINSON - Mahachai', 'ROBINSON - Mahachai (Akemi)', 'kongkrit'),
      (23, 'ROBINSON', 'Akemi', 'ROBINSON - Hat Yai', 'ROBINSON - Hat Yai (Akemi)', 'kongkrit'),
      (24, 'ROBINSON', 'Akemi', 'ROBINSON - Roi Et', 'ROBINSON - Roi Et (Akemi)', 'kongkrit'),
      (25, 'ROBINSON', 'Akemi', 'ROBINSON - Chalong', 'ROBINSON - Chalong (Akemi)', 'kongkrit'),
      (26, 'ROBINSON', 'Akemi', 'ROBINSON - Mae Sot', 'ROBINSON - Mae Sot (Akemi)', 'kongkrit'),
      (27, 'ROBINSON', 'Akemi', 'ROBINSON - Kamphaeng Phet', 'ROBINSON - Kamphaeng Phet (Akemi)', 'kongkrit'),
      (28, 'ROBINSON', 'Akemi', 'ROBINSON - Lopburi', 'ROBINSON - Lopburi (Akemi)', 'kongkrit'),
      (29, 'ROBINSON', 'Akemi', 'ROBINSON - Surin', 'ROBINSON - Surin (Akemi)', 'kongkrit'),
      (30, 'ROBINSON', 'Akemi', 'ROBINSON - Buri Ram', 'ROBINSON - Buri Ram (Akemi)', 'kongkrit'),
      (31, 'ROBINSON', 'Akemi', 'ROBINSON - Nakhon Si Thammarat 2', 'ROBINSON - Nakhon Si Thammarat 2 (Akemi)', 'kongkrit'),
      (32, 'ROBINSON', 'Akemi', 'ROBINSON - Lampang', 'ROBINSON - Lampang (Akemi)', 'kongkrit'),
      (33, 'ROBINSON', 'Akemi', 'ROBINSON - Sakhon Nakhon', 'ROBINSON - Sakhon Nakhon (Akemi)', 'kongkrit'),
      (34, 'CENTRAL', 'Akemi', 'CENTRAL - Rama 9', 'CENTRAL - Rama 9 (Akemi)', 'kongkrit'),
      (35, 'BIG C', 'Studio One', 'BIG C - Rajdamri', 'BIG C - Rajdamri (Studio One)', 'mali'),
      (36, 'BIG C', 'Studio One', 'BIG C - Pattaya 2', 'BIG C - Pattaya 2 (Studio One)', 'mali'),
      (37, 'BIG C', 'Studio One', 'BIG C - Ratchadaphisek', 'BIG C - Ratchadaphisek (Studio One)', 'mali'),
      (38, 'BIG C', 'Studio One', 'BIG C - Pattaya 3', 'BIG C - Pattaya 3 (Studio One)', 'mali'),
      (39, 'BIG C', 'Studio One', 'BIG C - Chiang Mai 2', 'BIG C - Chiang Mai 2 (Studio One)', 'mali'),
      (40, 'BIG C', 'Studio One', 'BIG C - Mega Bangna', 'BIG C - Mega Bangna (Studio One)', 'mali'),
      (41, 'BIG C', 'Studio One', 'BIG C - Rama 4', 'BIG C - Rama 4 (Studio One)', 'mali'),
      (42, 'BIG C', 'Studio One', 'BIG C - Suksawat', 'BIG C - Suksawat (Studio One)', 'mali'),
      (43, 'BIG C', 'Studio One', 'BIG C - On Nut', 'BIG C - On Nut (Studio One)', 'mali'),
      (44, 'BIG C', 'Studio One', 'BIG C - Itsaraphap', 'BIG C - Itsaraphap (Studio One)', 'mali'),
      (45, 'BIG C', 'Studio One', 'BIG C - Chiang Mai', 'BIG C - Chiang Mai (Studio One)', 'mali'),
      (46, 'BIG C', 'Studio One', 'BIG C - Hat Yai 2', 'BIG C - Hat Yai 2 (Studio One)', 'mali'),
      (47, 'BIG C', 'Studio One', 'BIG C - Hua Mak', 'BIG C - Hua Mak (Studio One)', 'mali'),
      (48, 'BIG C', 'Studio One', 'BIG C - Ekamai', 'BIG C - Ekamai (Studio One)', 'mali'),
      (49, 'BIG C', 'Studio One', 'BIG C - Tiwanon', 'BIG C - Tiwanon (Studio One)', 'mali'),
      (50, 'BIG C', 'Studio One', 'BIG C - Rangsit', 'BIG C - Rangsit (Studio One)', 'mali'),
      (51, 'BIG C', 'Studio One', 'BIG C - Hat Yai', 'BIG C - Hat Yai (Studio One)', 'mali'),
      (52, 'BIG C', 'Studio One', 'BIG C - Rattanathibet 2', 'BIG C - Rattanathibet 2 (Studio One)', 'mali'),
      (53, 'BIG C', 'Studio One', 'BIG C - Lat Phrao', 'BIG C - Lat Phrao (Studio One)', 'mali'),
      (54, 'BIG C', 'Studio One', 'BIG C - Bang Na', 'BIG C - Bang Na (Studio One)', 'mali'),
      (55, 'BIG C', 'Studio One', 'BIG C - Su-ngai Kolok', 'BIG C - Su-ngai Kolok (Studio One)', 'mali'),
      (56, 'BIG C', 'Studio One', 'BIG C - Pattani', 'BIG C - Pattani (Studio One)', 'mali'),
      (57, 'BIG C', 'Studio One', 'BIG C - Chaengwattana', 'BIG C - Chaengwattana (Studio One)', 'mali'),
      (58, 'BIG C', 'Studio One', 'BIG C - Phitsanulok', 'BIG C - Phitsanulok (Studio One)', 'mali'),
      (59, 'BIG C', 'Studio One', 'BIG C - Lam Luk Ka Klong 4', 'BIG C - Lam Luk Ka Klong 4 (Studio One)', 'mali'),
      (60, 'BIG C', 'Studio One', 'BIG C - Wong Sawang', 'BIG C - Wong Sawang (Studio One)', 'mali'),
      (61, 'BIG C', 'Studio One', 'BIG C - Ubon Ratchathani', 'BIG C - Ubon Ratchathani (Studio One)', 'mali'),
      (62, 'BIG C', 'Studio One', 'BIG C - Mahachai', 'BIG C - Mahachai (Studio One)', 'mali'),
      (63, 'BIG C', 'Studio One', 'BIG C - Yala', 'BIG C - Yala (Studio One)', 'mali'),
      (64, 'LOTUS', 'Studio One', 'LOTUS - Pattaya South', 'LOTUS - Pattaya South (Studio One)', 'mali'),
      (65, 'LOTUS', 'Studio One', 'LOTUS - Laksi', 'LOTUS - Laksi (Studio One)', 'mali'),
      (66, 'LOTUS', 'Studio One', 'LOTUS - Phitsanulok', 'LOTUS - Phitsanulok (Studio One)', 'mali'),
      (67, 'HOMEPRO', 'Akemi', 'HOMEPRO - Ekamai-Ramintra', 'HOMEPRO - Ekamai-Ramintra (Akemi)', 'mathawee'),
      (68, 'INDEX LIVING MALL', 'Akemi', 'INDEX LIVING MALL - Kaset-Nawamin', 'INDEX LIVING MALL - Kaset-Nawamin (Akemi)', 'mathawee'),
      (69, 'INDEX LIVING MALL', 'Akemi', 'INDEX LIVING MALL - Udon Thani', 'INDEX LIVING MALL - Udon Thani (Akemi)', 'mathawee'),
      (70, 'INDEX LIVING MALL', 'Akemi', 'INDEX LIVING MALL - Bang Na', 'INDEX LIVING MALL - Bang Na (Akemi)', 'mathawee'),
      (71, 'INDEX LIVING MALL', 'Akemi', 'INDEX LIVING MALL - Pattaya 2', 'INDEX LIVING MALL - Pattaya 2 (Akemi)', 'mathawee'),
      (72, 'INDEX LIVING MALL', 'Akemi', 'INDEX LIVING MALL - Chiang Mai', 'INDEX LIVING MALL - Chiang Mai (Akemi)', 'mathawee'),
      (73, 'INDEX LIVING MALL', 'Akemi', 'INDEX LIVING MALL - Phuket', 'INDEX LIVING MALL - Phuket (Akemi)', 'mathawee'),
      (74, 'INDEX LIVING MALL', 'Akemi', 'INDEX LIVING MALL - Rangsit', 'INDEX LIVING MALL - Rangsit (Akemi)', 'mathawee'),
      (75, 'INDEX LIVING MALL', 'Akemi', 'INDEX LIVING MALL - Rama 2', 'INDEX LIVING MALL - Rama 2 (Akemi)', 'mathawee'),
      (76, 'INDEX LIVING MALL', 'Akemi', 'INDEX LIVING MALL - Hat Yai', 'INDEX LIVING MALL - Hat Yai (Akemi)', 'mathawee'),
      (77, 'INDEX LIVING MALL', 'Akemi', 'INDEX LIVING MALL - Ratchaphruek', 'INDEX LIVING MALL - Ratchaphruek (Akemi)', 'mathawee'),
      (78, 'INDEX LIVING MALL', 'Akemi', 'INDEX LIVING MALL - Chiang Rai', 'INDEX LIVING MALL - Chiang Rai (Akemi)', 'mathawee'),
      (79, 'SB DESIGN SQUARE', 'Akemi', 'SB DESIGN SQUARE - Ratchaphruek', 'SB DESIGN SQUARE - Ratchaphruek (Akemi)', 'mathawee'),
      (80, 'SB DESIGN SQUARE', 'Akemi', 'SB DESIGN SQUARE - Bang Na', 'SB DESIGN SQUARE - Bang Na (Akemi)', 'mathawee'),
      (81, 'SB DESIGN SQUARE', 'Akemi', 'SB DESIGN SQUARE - Bang Khae', 'SB DESIGN SQUARE - Bang Khae (Akemi)', 'mathawee'),
      (82, 'SB DESIGN SQUARE', 'Akemi', 'SB DESIGN SQUARE - Rama 2', 'SB DESIGN SQUARE - Rama 2 (Akemi)', 'mathawee'),
      (83, 'SIAM TAKASHIMAYA', 'Akemi', 'SIAM TAKASHIMAYA - Icon Siam', 'SIAM TAKASHIMAYA - Icon Siam (Akemi)', 'mathawee'),
      (84, 'SIAM TAKASHIMAYA', 'Cannon', 'SIAM TAKASHIMAYA - Icon Siam', 'SIAM TAKASHIMAYA - Icon Siam (Cannon)', 'mathawee'),
      (85, 'INDEX LIVING MALL', 'Akemi', 'INDEX LIVING MALL - Ubon Ratchathani 2', 'INDEX LIVING MALL - Ubon Ratchathani 2 (Akemi)', 'mathawee'),
      (86, 'CENTRAL', 'Akemi', 'CENTRAL - Bang Na', 'CENTRAL - Bang Na (Akemi)', 'thanthaporn'),
      (87, 'CENTRAL', 'Cannon', 'CENTRAL - Bang Na', 'CENTRAL - Bang Na (Cannon)', 'thanthaporn'),
      (88, 'CENTRAL', 'Akemi', 'CENTRAL - Chaengwattana', 'CENTRAL - Chaengwattana (Akemi)', 'thanthaporn'),
      (89, 'CENTRAL', 'Cannon', 'CENTRAL - Chaengwattana', 'CENTRAL - Chaengwattana (Cannon)', 'thanthaporn'),
      (90, 'CENTRAL', 'Akemi', 'CENTRAL - Chiang Mai', 'CENTRAL - Chiang Mai (Akemi)', 'thanthaporn'),
      (91, 'CENTRAL', 'Cannon', 'CENTRAL - Chiang Mai', 'CENTRAL - Chiang Mai (Cannon)', 'thanthaporn'),
      (92, 'CENTRAL', 'Akemi', 'CENTRAL - Chidlom', 'CENTRAL - Chidlom (Akemi)', 'thanthaporn'),
      (93, 'CENTRAL', 'Cannon', 'CENTRAL - Chidlom', 'CENTRAL - Chidlom (Cannon)', 'thanthaporn'),
      (94, 'CENTRAL', 'Akemi', 'CENTRAL - East Ville', 'CENTRAL - East Ville (Akemi)', 'thanthaporn'),
      (95, 'CENTRAL', 'Cannon', 'CENTRAL - East Ville', 'CENTRAL - East Ville (Cannon)', 'thanthaporn'),
      (96, 'CENTRAL', 'Akemi', 'CENTRAL - Hat Yai Kanchana', 'CENTRAL - Hat Yai Kanchana (Akemi)', 'thanthaporn'),
      (97, 'CENTRAL', 'Cannon', 'CENTRAL - Hat Yai Kanchana', 'CENTRAL - Hat Yai Kanchana (Cannon)', 'thanthaporn'),
      (98, 'CENTRAL', 'Akemi', 'CENTRAL - Korat', 'CENTRAL - Korat (Akemi)', 'thanthaporn'),
      (99, 'CENTRAL', 'Akemi', 'CENTRAL - Lat Phrao', 'CENTRAL - Lat Phrao (Akemi)', 'thanthaporn'),
      (100, 'CENTRAL', 'Cannon', 'CENTRAL - Lat Phrao', 'CENTRAL - Lat Phrao (Cannon)', 'thanthaporn'),
      (101, 'CENTRAL', 'Akemi', 'CENTRAL - Mega Bangna', 'CENTRAL - Mega Bangna (Akemi)', 'thanthaporn'),
      (102, 'CENTRAL', 'Akemi', 'CENTRAL - Nakhon Pathom', 'CENTRAL - Nakhon Pathom (Akemi)', 'thanthaporn'),
      (103, 'CENTRAL', 'Akemi', 'CENTRAL - Nakhon Sawan', 'CENTRAL - Nakhon Sawan (Akemi)', 'thanthaporn'),
      (104, 'CENTRAL', 'Akemi', 'CENTRAL - Pattaya', 'CENTRAL - Pattaya (Akemi)', 'thanthaporn'),
      (105, 'CENTRAL', 'Cannon', 'CENTRAL - Pattaya', 'CENTRAL - Pattaya (Cannon)', 'thanthaporn'),
      (106, 'CENTRAL', 'Akemi', 'CENTRAL - Phuket', 'CENTRAL - Phuket (Akemi)', 'thanthaporn'),
      (107, 'CENTRAL', 'Akemi', 'CENTRAL - Pinklao', 'CENTRAL - Pinklao (Akemi)', 'thanthaporn'),
      (108, 'CENTRAL', 'Cannon', 'CENTRAL - Pinklao', 'CENTRAL - Pinklao (Cannon)', 'thanthaporn'),
      (109, 'CENTRAL', 'Akemi', 'CENTRAL - Ram Intra', 'CENTRAL - Ram Intra (Akemi)', 'thanthaporn'),
      (110, 'CENTRAL', 'Akemi', 'CENTRAL - Rama 2', 'CENTRAL - Rama 2 (Akemi)', 'thanthaporn'),
      (111, 'CENTRAL', 'Akemi', 'CENTRAL - Rama 3', 'CENTRAL - Rama 3 (Akemi)', 'thanthaporn'),
      (112, 'CENTRAL', 'Cannon', 'CENTRAL - Rama 3', 'CENTRAL - Rama 3 (Cannon)', 'thanthaporn'),
      (113, 'CENTRAL', 'Akemi', 'CENTRAL - Rangsit', 'CENTRAL - Rangsit (Akemi)', 'thanthaporn'),
      (114, 'CENTRAL', 'Cannon', 'CENTRAL - Rangsit', 'CENTRAL - Rangsit (Cannon)', 'thanthaporn'),
      (115, 'CENTRAL', 'Akemi', 'CENTRAL - Salaya', 'CENTRAL - Salaya (Akemi)', 'thanthaporn'),
      (116, 'CENTRAL', 'Akemi', 'CENTRAL - Silom', 'CENTRAL - Silom (Akemi)', 'thanthaporn'),
      (117, 'CENTRAL', 'Akemi', 'CENTRAL - Udon Thani', 'CENTRAL - Udon Thani (Akemi)', 'thanthaporn'),
      (118, 'CENTRAL', 'Akemi', 'CENTRAL - Westgate', 'CENTRAL - Westgate (Akemi)', 'thanthaporn'),
      (119, 'CENTRAL', 'Akemi', 'CENTRAL - Westville', 'CENTRAL - Westville (Akemi)', 'thanthaporn'),
      (120, 'CENTRAL', 'Akemi', 'CENTRAL - Zen World', 'CENTRAL - Zen World (Akemi)', 'thanthaporn'),
      (121, 'CENTRAL', 'Cannon', 'CENTRAL - Zen World', 'CENTRAL - Zen World (Cannon)', 'thanthaporn'),
      (122, 'THE MALL', 'Akemi', 'THE MALL - Paragon', 'THE MALL - Paragon (Akemi)', 'phurichaya'),
      (123, 'THE MALL', 'Akemi', 'THE MALL - Emporium', 'THE MALL - Emporium (Akemi)', 'phurichaya'),
      (124, 'THE MALL', 'Cannon', 'THE MALL - Emporium', 'THE MALL - Emporium (Cannon)', 'phurichaya'),
      (125, 'THE MALL', 'Akemi', 'THE MALL - Bang Kapi', 'THE MALL - Bang Kapi (Akemi)', 'phurichaya'),
      (126, 'THE MALL', 'Cannon', 'THE MALL - Bang Kapi', 'THE MALL - Bang Kapi (Cannon)', 'phurichaya'),
      (127, 'THE MALL', 'Akemi', 'THE MALL - Bang Khae', 'THE MALL - Bang Khae (Akemi)', 'phurichaya'),
      (128, 'THE MALL', 'Cannon', 'THE MALL - Bang Khae', 'THE MALL - Bang Khae (Cannon)', 'phurichaya'),
      (129, 'THE MALL', 'Akemi', 'THE MALL - Tha-Pra', 'THE MALL - Tha-Pra (Akemi)', 'phurichaya'),
      (130, 'THE MALL', 'Akemi', 'THE MALL - Ngam Wong Wan', 'THE MALL - Ngam Wong Wan (Akemi)', 'phurichaya'),
      (131, 'THE MALL', 'Cannon', 'THE MALL - Ngam Wong Wan', 'THE MALL - Ngam Wong Wan (Cannon)', 'phurichaya'),
      (132, 'THE MALL', 'Akemi', 'THE MALL - Korat', 'THE MALL - Korat (Akemi)', 'phurichaya'),
      (133, 'THE MALL', 'Towel', 'THE MALL - Paragon', 'THE MALL - Paragon (Towel)', 'phurichaya'),
      (134, 'THE MALL', 'Towel', 'THE MALL - Emporium', 'THE MALL - Emporium (Towel)', 'phurichaya'),
      (135, 'THE MALL', 'Towel', 'THE MALL - Bang Kapi', 'THE MALL - Bang Kapi (Towel)', 'phurichaya'),
      (136, 'THE MALL', 'Towel', 'THE MALL - Bang Khae', 'THE MALL - Bang Khae (Towel)', 'phurichaya'),
      (137, 'THE MALL', 'Towel', 'THE MALL - Ngam Wong Wan', 'THE MALL - Ngam Wong Wan (Towel)', 'phurichaya'),
      (138, NULL, NULL, NULL, 'ROBINSON - Ayutthaya (Akemi)', 'kongkrit'),
      (139, NULL, NULL, NULL, 'ROBINSON - Saraburi (Akemi)', 'kongkrit'),
      (140, NULL, NULL, NULL, 'ROBINSON - Lopburi (Cannon)', 'kongkrit'),
      (141, NULL, NULL, NULL, 'CENTRAL - Ladprao (Towel)', 'mal'),
      (142, NULL, NULL, NULL, 'CENTRAL - Rama 9 (Towel)', 'mal')
    `);

    // ===== 3) user_branches =====
    await connection.query(`
      CREATE TABLE user_branches (
        id INT(11) NOT NULL AUTO_INCREMENT,
        user_id INT(11) NOT NULL,
        branch_id INT(11) NOT NULL,
        PRIMARY KEY (id),
        KEY user_id (user_id),
        KEY branch_id (branch_id),
        CONSTRAINT user_branches_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT user_branches_ibfk_2 FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    `);

    await connection.query(`
      INSERT INTO user_branches (id, user_id, branch_id) VALUES
      (46, 7, 1),(47, 7, 2),(49, 7, 4),(50, 7, 5),(51, 7, 6),(52, 7, 7),(53, 7, 8),(54, 7, 9),
      (55, 7, 10),(56, 7, 11),(57, 7, 12),(58, 7, 13),(59, 7, 14),(60, 7, 15),(61, 7, 16),(62, 7, 17),
      (63, 7, 18),(64, 7, 19),(65, 7, 20),(66, 7, 21),(67, 7, 22),(68, 7, 23),(69, 7, 24),(70, 7, 25),
      (71, 7, 26),(72, 7, 27),(73, 7, 28),(74, 7, 29),(75, 7, 30),(76, 7, 31),(77, 7, 32),(78, 7, 33),
      (79, 7, 34),(80, 8, 35),(81, 8, 36),(82, 8, 37),(83, 8, 38),(84, 8, 39),(85, 8, 40),(86, 8, 41),
      (87, 8, 42),(88, 8, 43),(89, 8, 44),(90, 8, 45),(91, 8, 46),(92, 8, 47),(93, 8, 48),(94, 8, 49),
      (95, 8, 50),(96, 8, 51),(97, 8, 52),(98, 8, 53),(99, 8, 54),(100, 8, 55),(101, 8, 56),(102, 8, 57),
      (103, 8, 58),(104, 8, 59),(105, 8, 60),(106, 8, 61),(107, 8, 62),(108, 8, 63),(109, 8, 64),(110, 8, 65),
      (111, 8, 66),(112, 10, 67),(113, 10, 68),(114, 10, 69),(115, 10, 70),(116, 10, 71),(117, 10, 72),
      (118, 10, 73),(119, 10, 74),(120, 10, 75),(121, 10, 76),(122, 10, 77),(123, 10, 78),(124, 10, 79),
      (125, 10, 80),(126, 10, 81),(127, 10, 82),(128, 10, 83),(129, 10, 84),(130, 10, 85),(131, 11, 86),
      (132, 11, 87),(133, 11, 88),(134, 11, 89),(135, 11, 90),(136, 11, 91),(137, 11, 92),(138, 11, 93),
      (139, 11, 94),(140, 11, 95),(141, 11, 96),(142, 11, 97),(143, 11, 98),(144, 11, 99),(145, 11, 100),
      (146, 11, 101),(147, 11, 102),(148, 11, 103),(149, 11, 104),(150, 11, 105),(151, 11, 106),(152, 11, 107),
      (153, 11, 108),(154, 11, 109),(155, 11, 110),(156, 11, 111),(157, 11, 112),(158, 11, 113),(159, 11, 114),
      (160, 11, 115),(161, 11, 116),(162, 12, 117),(163, 12, 120),(164, 12, 121),(165, 12, 122),(166, 12, 123),
      (167, 12, 124),(168, 12, 125),(169, 12, 126),(170, 12, 127),(171, 12, 128),(172, 12, 129),(173, 12, 130),
      (174, 12, 131),(175, 7, 3)
    `);

    // ===== 4) visits =====
    await connection.query(`
      CREATE TABLE visits (
        id INT(11) NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) DEFAULT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        company VARCHAR(255) DEFAULT NULL,
        note TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    `);

    // ===== 5) work_log =====
    await connection.query(`
      CREATE TABLE work_log (
        id INT(11) NOT NULL AUTO_INCREMENT,
        work_date DATE NOT NULL,
        user_id INT(11) NOT NULL,
        branch_id INT(11) DEFAULT NULL,
        workplace VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        issue_text TEXT NOT NULL,
        resolution_text TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        before_images LONGTEXT DEFAULT NULL,
        after_images LONGTEXT DEFAULT NULL,
        retailer VARCHAR(255) DEFAULT '',
        brand VARCHAR(255) DEFAULT '',
        is_checked TINYINT(1) DEFAULT 0,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    `);

    await connection.commit();

    res.json({
      success: true,
      message: "Setup database complete",
      tables: ["branches", "store_assignments", "user_branches", "visits", "work_log"]
    });
  } catch (error) {
    await connection.rollback();
    console.error("Setup Error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});