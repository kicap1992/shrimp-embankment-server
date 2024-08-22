const mysql = require('mysql');
const dotenv = require('dotenv');

dotenv.config();

// Connect to the MySQL database
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// connection.connect((err) => {
//     if (err) {
//         console.error('Error connecting to MySQL database: ' + err.stack);
//         return;
//     }
//     console.log('Connected to MySQL database as id ' + connection.threadId);
// })

module.exports = {connection}