const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const db = mysql.createConnection({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT
});

db.connect((err) => {
    if (err) return console.error('เชื่อมต่อ Database ไม่สำเร็จ:', err.message);
    console.log('Connected to MySQL');
});

// === API สำหรับ Login ===
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT id, username, role FROM users WHERE username = ? AND password = ?";
    db.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (results.length > 0) {
            res.json({ success: true, user: results[0] });
        } else {
            res.status(401).json({ success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
        }
    });
});

// === API เกี่ยวกับพนักงาน (Users) ===
app.get('/api/users', (req, res) => {
    db.query("SELECT id, username, password, role FROM users", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/users', (req, res) => {
    const { username, password, role } = req.body;
    db.query("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", 
    [username, password, role], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { username, password, role } = req.body;
    let sql = "UPDATE users SET username = ?, role = ? WHERE id = ?";
    let params = [username, role, id];
    if (password && password.trim() !== "") {
        sql = "UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?";
        params = [username, password, role, id];
    }
    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: "อัปเดตข้อมูลพนักงานสำเร็จ" });
    });
});

app.delete('/api/users/:id', (req, res) => {
    db.query("DELETE FROM users WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

// === API เกี่ยวกับสาขา (Branches) ===
app.get('/api/branches', (req, res) => {
    db.query("SELECT * FROM branches", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/branches', (req, res) => {
    const { display_name } = req.body;
    db.query("INSERT INTO branches (display_name) VALUES (?)", [display_name], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true, id: result.insertId, display_name });
    });
});

app.get('/api/user-branches/:userId', (req, res) => {
    db.query("SELECT branch_id FROM user_branches WHERE user_id = ?", [req.params.userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results.map(r => r.branch_id));
    });
});

app.post('/api/user-branches/toggle', (req, res) => {
    const { userId, branchId } = req.body;
    db.query("SELECT * FROM user_branches WHERE user_id = ? AND branch_id = ?", [userId, branchId], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length > 0) {
            db.query("DELETE FROM user_branches WHERE user_id = ? AND branch_id = ?", [userId, branchId], (err) => res.json({ action: 'removed' }));
        } else {
            db.query("INSERT INTO user_branches (user_id, branch_id) VALUES (?, ?)", [userId, branchId], (err) => res.json({ action: 'added' }));
        }
    });
});

// === API สำหรับหน้าแบบฟอร์ม (Visit Form) ===
app.get('/api/user-branches-list/:userId', (req, res) => {
    const sql = `
        SELECT b.display_name 
        FROM user_branches ub
        JOIN branches b ON ub.branch_id = b.id
        WHERE ub.user_id = ?
    `;
    db.query(sql, [req.params.userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results); 
    });
});

app.post('/api/save-visit', (req, res) => {
    const { userId, workplace, description, issue_text, resolution_text, work_date, before_images, after_images, retailer, brand } = req.body;
    const sql = `INSERT INTO work_log 
        (user_id, workplace, description, issue_text, resolution_text, work_date, before_images, after_images, retailer, brand, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
    db.query(sql, [
        userId, workplace, description, issue_text, resolution_text, work_date, 
        JSON.stringify(before_images), JSON.stringify(after_images),
        retailer, brand
    ], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: "บันทึกข้อมูลเรียบร้อยแล้ว" });
    });
});

// === API สำหรับรายงาน (Work Log) ===
app.get('/api/work_log', (req, res) => {
    const sql = `
        SELECT wl.*, u.username 
        FROM work_log wl
        LEFT JOIN users u ON wl.user_id = u.id
        ORDER BY wl.created_at DESC
    `; 
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.delete('/api/work_log/:id', (req, res) => {
    const id = req.params.id;
    if (!id || id === 'undefined') {
        return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const sql = "DELETE FROM work_log WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "ไม่พบข้อมูล" });
        res.json({ success: true, message: "ลบข้อมูลสำเร็จ" });
    });
});

app.get('/api/user-filter-options/:userId', (req, res) => {
    const { userId } = req.params;
    const sql = `
        SELECT DISTINCT b.retailer, b.brand, b.display_name
        FROM user_branches ub
        JOIN branches b ON ub.branch_id = b.id
        WHERE ub.user_id = ?
    `;
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/filtered-branches', (req, res) => {
    const { userId, retailer, brand } = req.query;
    let sql = `
        SELECT DISTINCT b.display_name as workplace 
        FROM user_branches ub
        JOIN branches b ON ub.branch_id = b.id
        WHERE ub.user_id = ?
    `;
    let params = [userId];

    if (retailer && retailer !== '') {
        sql += " AND b.retailer = ?";
        params.push(retailer);
    }
    if (brand && brand !== '') {
        sql += " AND b.brand = ?";
        params.push(brand);
    }

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.put('/api/work_log/check/:id', (req, res) => {
    const { id } = req.params;
    const { is_checked } = req.body;
    const sql = "UPDATE work_log SET is_checked = ? WHERE id = ?";
    db.query(sql, [is_checked ? 1 : 0, id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));