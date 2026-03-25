const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || "localhost",
  user: process.env.MYSQLUSER || "root",
  password: process.env.MYSQLPASSWORD || "",
  database: process.env.MYSQLDATABASE || "test",
  port: process.env.MYSQLPORT || 3306,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ เชื่อมต่อ Database ไม่สำเร็จ:", err.message);
  } else {
    console.log("✅ เชื่อมต่อ Database สำเร็จแล้ว!");
    connection.release();
  }
});

module.exports = pool.promise();