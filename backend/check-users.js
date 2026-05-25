import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'crickfin.db');

const db = new sqlite3.Database(dbPath);

db.all("SELECT id, name, email, phone, role, status FROM users", [], (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log("Users in Database:");
    console.log(rows);
  }
  db.close();
});
