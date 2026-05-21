import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbPath = path.join(__dirname, 'crickfin.db');

// Support running on Vercel serverless (where only /tmp is writable)
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
if (isVercel) {
  const tempDbPath = path.join('/tmp', 'crickfin.db');
  try {
    if (!fs.existsSync(tempDbPath)) {
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, tempDbPath);
        console.log('Copied database to /tmp/crickfin.db');
      } else {
        console.log('Database not found in package, starting fresh');
      }
    }
  } catch (err) {
    console.error('Error copying database to /tmp:', err);
  }
  dbPath = tempDbPath;
}

const db = new sqlite3.Database(dbPath);

// Helper function to wrap db methods in Promises
export const query = {
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
};

// Initialize database tables
export async function initDb() {
  // Enable foreign keys
  await query.run('PRAGMA foreign_keys = ON');

  // 1. Teams Table
  await query.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Users Table (Players and Admins)
  await query.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'player')) NOT NULL,
      status TEXT CHECK(status IN ('pending', 'approved')) DEFAULT 'pending',
      team_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
    )
  `);

  // 3. Matches Table
  await query.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      match_date TEXT NOT NULL,
      opponent_team TEXT NOT NULL,
      venue TEXT NOT NULL,
      match_type TEXT CHECK(match_type IN ('league', 'knockout', 'friendly')) NOT NULL,
      status TEXT CHECK(status IN ('scheduled', 'completed')) DEFAULT 'scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Match Participation Table
  await query.run(`
    CREATE TABLE IF NOT EXISTS match_participation (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      balls_bowled INTEGER DEFAULT 0,
      balls_played INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 5. Payments Table
  await query.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('cash', 'gpay')) NOT NULL,
      reference_id TEXT,
      allocation TEXT CHECK(allocation IN ('general', 'ball_fees')) DEFAULT 'general',
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 6. Ball Fees Config Table
  await query.run(`
    CREATE TABLE IF NOT EXISTS ball_fees_config (
      id TEXT PRIMARY KEY,
      cost_per_ball REAL NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 7. Expenses Table
  await query.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category TEXT CHECK(category IN ('kits', 'bats', 'medicines', 'trophies', 'ground_fees', 'umpire_fees', 'others')) NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('cash', 'gpay')) NOT NULL,
      status TEXT CHECK(status IN ('active', 'void')) DEFAULT 'active',
      receipt_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default configurations and admin if empty
  await seedDb();
}

async function seedDb() {
  // 1. Seed Ball Fees Config
  const feeConfig = await query.get('SELECT * FROM ball_fees_config LIMIT 1');
  if (!feeConfig) {
    await query.run(
      'INSERT INTO ball_fees_config (id, cost_per_ball) VALUES (?, ?)',
      [crypto.randomUUID(), 10.0] // Default ₹10 per ball config
    );
  }

  // 2. Seed Default Admin
  const adminUser = await query.get('SELECT * FROM users WHERE role = "admin" LIMIT 1');
  if (!adminUser) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    await query.run(
      `INSERT INTO users (id, name, email, phone, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        'League Admin',
        'admin@crickfin.com',
        '9999999999',
        hash,
        'admin',
        'approved'
      ]
    );
    console.log('Seeded default admin user: admin@crickfin.com / admin123');
  }
}
