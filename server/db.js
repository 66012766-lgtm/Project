const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

// เทสต์การเชื่อมต่อ
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ เชื่อมต่อ Database ไม่สำเร็จ:', err.message);
  } else {
    console.log('✅ เชื่อมต่อ Database สำเร็จแล้ว!');
    connection.release();
  }
});

// ใช้ promise() เพื่อให้รองรับ async/await
module.exports = pool.promise();