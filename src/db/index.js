const mysql = require("mysql2");
const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = require("../config/env");

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // Return DATE/DATETIME as strings to prevent timezone shifts
});

module.exports = pool.promise();
