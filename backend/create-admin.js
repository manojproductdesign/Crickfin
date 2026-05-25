import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from './db.js';

async function createAdmin(name, email, phone, password) {
  // Validate password strength (matches backend requirements)
  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters long');
    process.exit(1);
  }
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
  if (!passwordRegex.test(password)) {
    console.error('Error: Password must contain at least one uppercase letter, one lowercase letter, and one number');
    process.exit(1);
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const id = crypto.randomUUID();

    // Check if user already exists
    const existingUser = await query.get('SELECT * FROM users WHERE email = ? OR phone = ?', [email, phone]);
    if (existingUser) {
      console.error(`Error: User with email '${email}' or phone '${phone}' already exists.`);
      process.exit(1);
    }

    await query.run(
      `INSERT INTO users (id, name, email, phone, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, email, phone, hash, 'admin', 'approved']
    );

    console.log('\n========================================');
    console.log('SUCCESS: Admin User Created Successfully');
    console.log('========================================');
    console.log(`Name:     ${name}`);
    console.log(`Email:    ${email}`);
    console.log(`Phone:    ${phone}`);
    console.log(`Password: ${password}`);
    console.log('========================================\n');
  } catch (error) {
    console.error('Database Error:', error.message);
  }
}

// Read args
const args = process.argv.slice(2);
if (args.length < 4) {
  console.log('Usage: node create-admin.js "<name>" "<email>" "<phone>" "<password>"');
  console.log('Example: node create-admin.js "System Admin" "admin2@crickfin.com" "9876543210" "AdminPass123"');
  process.exit(1);
}

const [name, email, phone, password] = args;
createAdmin(name, email, phone, password);
