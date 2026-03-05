require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const env = require('./config/environment');

async function setup() {
  console.log('🚀 Setting up CRMPusher database...');

  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  });

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${env.DB_NAME}\``);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      table_name VARCHAR(100) NOT NULL UNIQUE,
      crm_api_url VARCHAR(500) NOT NULL,
      crm_api_key VARCHAR(500) NOT NULL,
      default_status VARCHAR(100) DEFAULT 'New Lead',
      description TEXT DEFAULT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [existing] = await conn.query('SELECT id FROM users WHERE username = ?', [env.ADMIN_USERNAME]);
  if (existing.length === 0) {
    const hash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
    await conn.query('INSERT INTO users (username, password) VALUES (?, ?)', [env.ADMIN_USERNAME, hash]);
    console.log(`✅ Admin user created: ${env.ADMIN_USERNAME} / ${env.ADMIN_PASSWORD}`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${env.ADMIN_USERNAME}`);
  }

  await conn.end();
  console.log('✅ Database setup complete! You can now start the server with: npm run dev');
}

setup().catch((err) => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
