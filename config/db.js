const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

// ONLY add SSL if we are NOT on our local machine
if (process.env.NODE_ENV === "production") {
    dbConfig.ssl = {
        rejectUnauthorized: false,
        ca: fs.readFileSync(path.join(__dirname, "../global-bundle.pem"))
    };
}

const db = mysql.createPool(dbConfig);

module.exports = db.promise();

