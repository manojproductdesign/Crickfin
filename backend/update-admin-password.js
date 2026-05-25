import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'crickfin.db');

const db = new sqlite3.Database(dbPath);

async function updatePassword() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Admin@Crickfin123', salt);
    
    db.run("UPDATE users SET password_hash = ? WHERE email = ?", [hash, 'admin@crickfin.com'], function(err) {
      if (err) {
        console.error("Error updating password:", err);
      } else {
        console.log(`Successfully updated admin password. Rows affected: ${this.changes}`);
      }
      db.close();
    });
  } catch (err) {
    console.error("Error generating hash:", err);
    db.close();
  }
}

updatePassword();
