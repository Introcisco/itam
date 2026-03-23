import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

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

      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        displayName VARCHAR(100),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await initPool.query(schema);

    // Seed default users if the table is empty
    const [userRows] = await initPool.query('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count === 0) {
      let defaultPassword = process.env.INIT_ADMIN_PASSWORD;
      if (!defaultPassword) {
        // Generate a random password if none is provided
        defaultPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        console.warn('==================================================');
        console.warn('⚠️ WARNING: No INIT_ADMIN_PASSWORD provided.');
        console.warn(`🔑 Generated default admin password: ${defaultPassword}`);
        console.warn('⚠️ Please save this password and change it later.');
        console.warn('==================================================');
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);
      
      const values = [
        ['admin', hashedPassword, 'admin', '系统管理员'],
        ['user', hashedPassword, 'user', '普通用户']
      ];
      
      await initPool.query(
        'INSERT INTO users (username, password_hash, role, displayName) VALUES ?',
        [values]
      );
      console.log('Default users (admin, user) created.');
    }

    await initPool.end();
    console.log('Database and tables initialized.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

export default pool;
