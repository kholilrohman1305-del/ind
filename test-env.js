// Test Environment Variables
require('dotenv').config();

console.log('=== ENVIRONMENT VARIABLES TEST ===');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('DB_PASS:', process.env.DB_PASS ? '***SET***' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('PORT:', process.env.PORT || 'NOT SET');
console.log('===================================');

// Try to connect to database
const mysql = require('mysql2');

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
};

console.log('\n=== ATTEMPTING DATABASE CONNECTION ===');
console.log('Host:', config.host);
console.log('User:', config.user);
console.log('Database:', config.database);

const connection = mysql.createConnection(config);

connection.connect((err) => {
  if (err) {
    console.error('\n❌ DATABASE CONNECTION FAILED!');
    console.error('Error Code:', err.code);
    console.error('Error Message:', err.message);
    console.error('Error Stack:', err.stack);
    process.exit(1);
  }

  console.log('\n✅ DATABASE CONNECTION SUCCESSFUL!');
  console.log('Connection ID:', connection.threadId);

  connection.end();
  process.exit(0);
});
