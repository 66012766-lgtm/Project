const mysql = require("mysql2");

const requiredEnvs = [
  "MYSQLHOST",
  "MYSQLUSER",
  "MYSQLPASSWORD",
  "MYSQLDATABASE",
  "MYSQLPORT",
];

for (const key of requiredEnvs) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

const poolConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: Number(process.env.MYSQLPORT),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
};

if (process.env.NODE_ENV === "production") {
  poolConfig.ssl = {
    rejectUnauthorized: true,
  };
}

const pool = mysql.createPool(poolConfig);

pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ เชื่อมต่อ Database ไม่สำเร็จ:", err.message);
    console.error("รายละเอียด:", err);
  } else {
    console.log("✅ เชื่อมต่อ Database สำเร็จแล้ว!");
    connection.release();
  }
});

module.exports = pool.promise();