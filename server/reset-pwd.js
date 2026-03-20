import bcrypt from 'bcryptjs';
import pool from './db.js';

const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
  console.log('🔴 用法错误！');
  console.log('正确格式: node reset-pwd.js <用户名> <新密码>');
  console.log('例如: node reset-pwd.js admin 123456');
  process.exit(1);
}

async function run() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    const [result] = await pool.query('UPDATE users SET password_hash = ? WHERE username = ?', [hashedPassword, username]);
    
    if (result.affectedRows === 0) {
      console.log(`⚠️ 重置失败：数据库中不存在名为 "${username}" 的用户。`);
    } else {
      console.log(`✅ 成功！用户 "${username}" 的密码已修改为: ${newPassword}`);
    }
  } catch (err) {
    console.error('❌ 重置发生系统错误:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
