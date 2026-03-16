import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'itam_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function initDb() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    const dbName = process.env.DB_NAME || 'itam_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.end();

    const initPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName,
      multipleStatements: true
    });

    const schema = `
      CREATE TABLE IF NOT EXISTS assets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assetCode VARCHAR(20) UNIQUE,
        name VARCHAR(100),
        category VARCHAR(50),
        brand VARCHAR(50),
        model VARCHAR(100),
        serialNumber VARCHAR(100),
        status VARCHAR(20),
        location VARCHAR(100),
        assignee VARCHAR(50),
        purchaseDate DATE,
        purchasePrice DECIMAL(10, 2),
        warrantyExpiry DATE,
        supplier VARCHAR(100),
        company VARCHAR(100),
        specs TEXT,
        notes TEXT,
        createdAt DATETIME
      );

      CREATE TABLE IF NOT EXISTS transfers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assetId INT,
        type VARCHAR(20),
        fromUser VARCHAR(50),
        toUser VARCHAR(50),
        date DATETIME,
        operator VARCHAR(50),
        FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS maintenance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assetId INT,
        type VARCHAR(50),
        status VARCHAR(20),
        startDate DATE,
        vendor VARCHAR(100),
        FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS auditLogs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assetId INT,
        action VARCHAR(50),
        details TEXT,
        operator VARCHAR(50),
        timestamp DATETIME,
        FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
      );
    `;

    await initPool.query(schema);
    await initPool.end();
    console.log('Database and tables initialized.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

export default pool;
