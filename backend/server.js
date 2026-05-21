import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { initDb, query } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'crickfin_super_secret_key_2026';

app.use(cors());
app.use(express.json());

// Initialize Database on startup
initDb()
  .then(() => console.log('Database initialized successfully'))
  .catch((err) => console.error('Database initialization failed:', err));

// ==========================================
// Middleware
// ==========================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

// ==========================================
// Authentication Routes
// ==========================================

// Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !phone || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (role !== 'admin' && role !== 'player') {
    return res.status(400).json({ message: 'Invalid role selection' });
  }

  try {
    // Check if user already exists
    const existingUser = await query.get('SELECT * FROM users WHERE email = ? OR phone = ?', [email, phone]);
    if (existingUser) {
      return res.status(400).json({ message: 'Email or phone number already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = crypto.randomUUID();

    // Default player registration needs approval, admin needs approval too unless seeded
    const status = 'pending';

    await query.run(
      `INSERT INTO users (id, name, email, phone, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, email, phone, passwordHash, role, status]
    );

    res.status(201).json({
      message: 'Registration successful! Waiting for admin approval.',
      userId: id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Check email or phone login
    const user = await query.get('SELECT * FROM users WHERE (email = ? OR phone = ?) AND deleted_at IS NULL', [email, email]);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ message: 'Your account is pending admin approval' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30m' } // 30 minutes session timeout (NFR requirement)
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        team_id: user.team_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await query.get(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.team_id, t.name as team_name
       FROM users u
       LEFT JOIN teams t ON u.team_id = t.id
       WHERE u.id = ? AND u.deleted_at IS NULL`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving profile' });
  }
});

// Approve Registration (Admin only)
app.post('/api/auth/approve', authenticateToken, isAdmin, async (req, res) => {
  const { userId, status } = req.body; // status: 'approved'

  if (!userId || !status) {
    return res.status(400).json({ message: 'userId and status are required' });
  }

  try {
    await query.run('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
    res.json({ message: `User status successfully updated to ${status}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error approving user' });
  }
});

// ==========================================
// Player Management Routes
// ==========================================

// Get All Players (Admin or Logged In Player list)
app.get('/api/players', authenticateToken, async (req, res) => {
  try {
    // Read search, filter queries
    const { search, teamId, status } = req.query;
    let sql = `
      SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.team_id, t.name as team_name, u.created_at
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.role = 'player' AND u.deleted_at IS NULL
    `;
    const params = [];

    if (search) {
      sql += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (teamId) {
      sql += ` AND u.team_id = ?`;
      params.push(teamId);
    }

    if (status) {
      sql += ` AND u.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY u.name ASC`;

    const players = await query.all(sql, params);
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving players' });
  }
});

// Add Player (Admin only)
app.post('/api/players', authenticateToken, isAdmin, async (req, res) => {
  const { name, email, phone, password, teamId } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: 'Name, email, phone, and password are required' });
  }

  try {
    const existingUser = await query.get('SELECT * FROM users WHERE email = ? OR phone = ?', [email, phone]);
    if (existingUser) {
      return res.status(400).json({ message: 'Email or phone already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = crypto.randomUUID();

    await query.run(
      `INSERT INTO users (id, name, email, phone, password_hash, role, status, team_id)
       VALUES (?, ?, ?, ?, ?, 'player', 'approved', ?)`,
      [id, name, email, phone, passwordHash, teamId || null]
    );

    res.status(201).json({ message: 'Player added successfully', playerId: id });
  } catch (error) {
    res.status(500).json({ message: 'Server error adding player' });
  }
});

// Edit Player (Admin only)
app.put('/api/players/:id', authenticateToken, isAdmin, async (req, res) => {
  const { name, email, phone, teamId, status } = req.body;
  const playerId = req.params.id;

  try {
    // Check conflicts
    const conflictUser = await query.get(
      'SELECT * FROM users WHERE (email = ? OR phone = ?) AND id != ? AND deleted_at IS NULL',
      [email, phone, playerId]
    );
    if (conflictUser) {
      return res.status(400).json({ message: 'Email or phone already registered by another user' });
    }

    await query.run(
      `UPDATE users
       SET name = ?, email = ?, phone = ?, team_id = ?, status = ?
       WHERE id = ? AND role = 'player'`,
      [name, email, phone, teamId || null, status, playerId]
    );

    res.json({ message: 'Player details updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating player' });
  }
});

// Delete Player (Soft Delete, Admin only)
app.delete('/api/players/:id', authenticateToken, isAdmin, async (req, res) => {
  const playerId = req.params.id;

  try {
    await query.run('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND role = "player"', [playerId]);
    res.json({ message: 'Player soft-deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting player' });
  }
});

// ==========================================
// Match Management Routes
// ==========================================

// List Matches
app.get('/api/matches', authenticateToken, async (req, res) => {
  try {
    const matches = await query.all('SELECT * FROM matches ORDER BY match_date DESC');
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving matches' });
  }
});

// Create Match (Admin only)
app.post('/api/matches', authenticateToken, isAdmin, async (req, res) => {
  const { matchDate, opponentTeam, venue, matchType } = req.body;

  if (!matchDate || !opponentTeam || !venue || !matchType) {
    return res.status(400).json({ message: 'All match fields are required' });
  }

  try {
    const id = crypto.randomUUID();
    await query.run(
      `INSERT INTO matches (id, match_date, opponent_team, venue, match_type, status)
       VALUES (?, ?, ?, ?, ?, 'scheduled')`,
      [id, matchDate, opponentTeam, venue, matchType]
    );
    res.status(201).json({ message: 'Match created successfully', matchId: id });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating match' });
  }
});

// Update Match Status / Complete Match (Admin only)
app.put('/api/matches/:id', authenticateToken, isAdmin, async (req, res) => {
  const { status, opponentTeam, venue, matchType, matchDate } = req.body;
  const matchId = req.params.id;

  try {
    await query.run(
      `UPDATE matches
       SET status = COALESCE(?, status),
           opponent_team = COALESCE(?, opponent_team),
           venue = COALESCE(?, venue),
           match_type = COALESCE(?, match_type),
           match_date = COALESCE(?, match_date)
       WHERE id = ?`,
      [status, opponentTeam, venue, matchType, matchDate, matchId]
    );
    res.json({ message: 'Match updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating match' });
  }
});

// Get Match Participation
app.get('/api/matches/:id/participation', authenticateToken, async (req, res) => {
  const matchId = req.params.id;
  try {
    const list = await query.all(
      `SELECT mp.id, mp.player_id, mp.balls_bowled, mp.balls_played, u.name as player_name, t.name as team_name
       FROM match_participation mp
       JOIN users u ON mp.player_id = u.id
       LEFT JOIN teams t ON u.team_id = t.id
       WHERE mp.match_id = ?`,
      [matchId]
    );
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving participation records' });
  }
});

// Update/Set Match Participation (Admin only)
app.post('/api/matches/:id/participation', authenticateToken, isAdmin, async (req, res) => {
  const matchId = req.params.id;
  const { participations } = req.body; // Array: [{ playerId, ballsBowled, ballsPlayed }]

  if (!Array.isArray(participations)) {
    return res.status(400).json({ message: 'Participations list is required' });
  }

  try {
    // Delete old participations for this match
    await query.run('DELETE FROM match_participation WHERE match_id = ?', [matchId]);

    // Insert new participations
    for (const p of participations) {
      const id = crypto.randomUUID();
      await query.run(
        `INSERT INTO match_participation (id, match_id, player_id, balls_bowled, balls_played)
         VALUES (?, ?, ?, ?, ?)`,
        [id, matchId, p.playerId, p.ballsBowled || 0, p.ballsPlayed || 0]
      );
    }

    res.json({ message: 'Match participation updated successfully' });
  } catch (error) {
    console.error('Participation error:', error);
    res.status(500).json({ message: 'Server error updating match participation' });
  }
});

// ==========================================
// Fee Configuration
// ==========================================

// Get Ball Fees Cost Configuration
app.get('/api/ball-fees/config', authenticateToken, async (req, res) => {
  try {
    const config = await query.get('SELECT * FROM ball_fees_config ORDER BY updated_at DESC LIMIT 1');
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving fee config' });
  }
});

// Update Ball Fees Cost Configuration (Admin only)
app.post('/api/ball-fees/config', authenticateToken, isAdmin, async (req, res) => {
  const { costPerBall } = req.body;

  if (costPerBall === undefined || costPerBall < 0) {
    return res.status(400).json({ message: 'Valid cost per ball is required' });
  }

  try {
    const id = crypto.randomUUID();
    await query.run('INSERT INTO ball_fees_config (id, cost_per_ball) VALUES (?, ?)', [id, costPerBall]);
    res.json({ message: 'Ball fee configuration updated successfully', costPerBall });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating fee config' });
  }
});

// ==========================================
// Payments Module
// ==========================================

// Get Payments
app.get('/api/payments', authenticateToken, async (req, res) => {
  const { playerId, method, dateStart, dateEnd } = req.query;

  try {
    let sql = `
      SELECT p.*, u.name as player_name, t.name as team_name
      FROM payments p
      JOIN users u ON p.player_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE 1=1
    `;
    const params = [];

    // Filter player access (players can only see their own history unless they are admins)
    if (req.user.role === 'player') {
      sql += ' AND p.player_id = ?';
      params.push(req.user.id);
    } else if (playerId) {
      sql += ' AND p.player_id = ?';
      params.push(playerId);
    }

    if (method) {
      sql += ' AND p.payment_method = ?';
      params.push(method);
    }

    if (dateStart) {
      sql += ' AND p.payment_date >= ?';
      params.push(dateStart);
    }

    if (dateEnd) {
      sql += ' AND p.payment_date <= ?';
      params.push(dateEnd);
    }

    sql += ' ORDER BY p.payment_date DESC';

    const payments = await query.all(sql, params);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving payments' });
  }
});

// Record Payment (Admin only)
app.post('/api/payments', authenticateToken, isAdmin, async (req, res) => {
  const { playerId, amount, paymentDate, paymentMethod, referenceId, allocation, remarks } = req.body;

  if (!playerId || !amount || !paymentDate || !paymentMethod) {
    return res.status(400).json({ message: 'Player, amount, date, and method are required' });
  }

  if (paymentMethod === 'gpay' && !referenceId) {
    return res.status(400).json({ message: 'Transaction ID is required for GPay payments' });
  }

  try {
    const id = crypto.randomUUID();
    await query.run(
      `INSERT INTO payments (id, player_id, amount, payment_date, payment_method, reference_id, allocation, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, playerId, amount, paymentDate, paymentMethod, referenceId || null, allocation || 'general', remarks || '']
    );
    res.status(201).json({ message: 'Payment recorded successfully', paymentId: id });
  } catch (error) {
    res.status(500).json({ message: 'Server error recording payment' });
  }
});

// ==========================================
// Expense Routes
// ==========================================

// Get Expenses
app.get('/api/expenses', authenticateToken, async (req, res) => {
  const { category, dateStart, dateEnd } = req.query;

  try {
    let sql = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (dateStart) {
      sql += ' AND expense_date >= ?';
      params.push(dateStart);
    }

    if (dateEnd) {
      sql += ' AND expense_date <= ?';
      params.push(dateEnd);
    }

    sql += ' ORDER BY expense_date DESC';

    const expenses = await query.all(sql, params);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving expenses' });
  }
});

// Record Expense (Admin only)
app.post('/api/expenses', authenticateToken, isAdmin, async (req, res) => {
  const { category, description, amount, expenseDate, paymentMethod, receiptUrl } = req.body;

  if (!category || !description || !amount || !expenseDate || !paymentMethod) {
    return res.status(400).json({ message: 'All expense fields are required' });
  }

  try {
    const id = crypto.randomUUID();
    await query.run(
      `INSERT INTO expenses (id, category, description, amount, expense_date, payment_method, status, receipt_url)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
      [id, category, description, amount, expenseDate, paymentMethod, receiptUrl || null]
    );
    res.status(201).json({ message: 'Expense recorded successfully', expenseId: id });
  } catch (error) {
    res.status(500).json({ message: 'Server error recording expense' });
  }
});

// Edit/Void Expense (Admin only)
app.put('/api/expenses/:id', authenticateToken, isAdmin, async (req, res) => {
  const { category, description, amount, expenseDate, paymentMethod, status, receiptUrl } = req.body;
  const expenseId = req.params.id;

  try {
    await query.run(
      `UPDATE expenses
       SET category = COALESCE(?, category),
           description = COALESCE(?, description),
           amount = COALESCE(?, amount),
           expense_date = COALESCE(?, expense_date),
           payment_method = COALESCE(?, payment_method),
           status = COALESCE(?, status),
           receipt_url = COALESCE(?, receipt_url)
       WHERE id = ?`,
      [category, description, amount, expenseDate, paymentMethod, status, receiptUrl, expenseId]
    );
    res.json({ message: 'Expense updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating expense' });
  }
});

// ==========================================
// Team Management Routes
// ==========================================

// Get All Teams
app.get('/api/teams', authenticateToken, async (req, res) => {
  try {
    const teams = await query.all('SELECT * FROM teams ORDER BY name ASC');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving teams' });
  }
});

// Create Team (Admin only)
app.post('/api/teams', authenticateToken, isAdmin, async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Team name is required' });
  }

  try {
    const id = crypto.randomUUID();
    await query.run('INSERT INTO teams (id, name) VALUES (?, ?)', [id, name]);
    res.status(201).json({ message: 'Team created successfully', teamId: id });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ message: 'Team name already exists' });
    }
    res.status(500).json({ message: 'Server error creating team' });
  }
});

// Assign Player to Team (Admin only)
app.post('/api/teams/assign', authenticateToken, isAdmin, async (req, res) => {
  const { playerId, teamId } = req.body;

  if (!playerId) {
    return res.status(400).json({ message: 'Player ID is required' });
  }

  try {
    await query.run('UPDATE users SET team_id = ? WHERE id = ? AND role = "player"', [teamId || null, playerId]);
    res.json({ message: 'Player assigned to team successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error assigning player to team' });
  }
});

// ==========================================
// Dashboard and Financial Summaries
// ==========================================

// Helper function to fetch financial balances dynamically
async function calculatePlayerFinancials(playerId = null) {
  // 1. Fetch current cost per ball
  const config = await query.get('SELECT cost_per_ball FROM ball_fees_config ORDER BY updated_at DESC LIMIT 1');
  const costPerBall = config ? config.cost_per_ball : 10.0;

  // 2. Fetch participation counts & match entry costs
  // Assume: standard match entry fee is ₹100 per match, ball fees is calculated separately
  const entryFeePerMatch = 100.0;

  let participationSql = `
    SELECT mp.player_id,
           COUNT(mp.match_id) as matches_played,
           SUM(mp.balls_played) as total_balls_played,
           SUM(mp.balls_bowled) as total_balls_bowled
    FROM match_participation mp
    JOIN matches m ON mp.match_id = m.id
    WHERE m.status = 'completed'
  `;
  const partParams = [];
  if (playerId) {
    participationSql += ' AND mp.player_id = ?';
    partParams.push(playerId);
  }
  participationSql += ' GROUP BY mp.player_id';

  const participations = await query.all(participationSql, partParams);
  const participationMap = {};
  participations.forEach(p => {
    participationMap[p.player_id] = {
      matchesCount: p.matches_played,
      totalBalls: (p.total_balls_played || 0) + (p.total_balls_bowled || 0),
      ballsPlayed: p.total_balls_played || 0,
      ballsBowled: p.total_balls_bowled || 0,
      ballFeesDue: ((p.total_balls_played || 0) + (p.total_balls_bowled || 0)) * costPerBall,
      generalFeesDue: p.matches_played * entryFeePerMatch
    };
  });

  // 3. Fetch payment collections
  let paymentSql = `
    SELECT player_id,
           SUM(CASE WHEN allocation = 'general' THEN amount ELSE 0 END) as general_paid,
           SUM(CASE WHEN allocation = 'ball_fees' THEN amount ELSE 0 END) as ball_fees_paid
    FROM payments
    WHERE 1=1
  `;
  const payParams = [];
  if (playerId) {
    paymentSql += ' AND player_id = ?';
    payParams.push(playerId);
  }
  paymentSql += ' GROUP BY player_id';

  const payments = await query.all(paymentSql, payParams);
  const paymentMap = {};
  payments.forEach(p => {
    paymentMap[p.player_id] = {
      generalPaid: p.general_paid || 0,
      ballFeesPaid: p.ball_fees_paid || 0
    };
  });

  // 4. Combine users info
  let userSql = `SELECT id, name, email, phone, team_id FROM users WHERE role = 'player' AND deleted_at IS NULL`;
  const userParams = [];
  if (playerId) {
    userSql += ' AND id = ?';
    userParams.push(playerId);
  }

  const players = await query.all(userSql, userParams);

  return players.map(player => {
    const part = participationMap[player.id] || { matchesCount: 0, totalBalls: 0, ballsPlayed: 0, ballsBowled: 0, ballFeesDue: 0, generalFeesDue: 0 };
    const pay = paymentMap[player.id] || { generalPaid: 0, ballFeesPaid: 0 };

    const totalDue = part.ball_fees_due + part.general_fees_due;
    const totalPaid = pay.general_paid + pay.ball_fees_paid;

    return {
      playerId: player.id,
      name: player.name,
      email: player.email,
      phone: player.phone,
      team_id: player.team_id,
      matchesPlayed: part.matchesCount,
      ballsPlayed: part.ballsPlayed,
      ballsBowled: part.ballsBowled,
      generalFeesDue: part.generalFeesDue,
      generalPaid: pay.generalPaid,
      generalBalance: part.generalFeesDue - pay.generalPaid,
      ballFeesDue: part.ballFeesDue,
      ballFeesPaid: pay.ballFeesPaid,
      ballFeesBalance: part.ballFeesDue - pay.ballFeesPaid,
      totalDue: part.generalFeesDue + part.ballFeesDue,
      totalPaid: pay.generalPaid + pay.ballFeesPaid,
      totalBalance: (part.generalFeesDue + part.ballFeesDue) - (pay.generalPaid + pay.ballFeesPaid)
    };
  });
}

// Global Financial Summary Dashboard (Admin only)
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    // 1. Total Collections (from all payments)
    const collectionsResult = await query.get('SELECT SUM(amount) as total FROM payments');
    const totalCollections = collectionsResult?.total || 0;

    // Breakdown collections by method
    const paymentMethodsResult = await query.all(`
      SELECT payment_method, SUM(amount) as total
      FROM payments
      GROUP BY payment_method
    `);
    const collectionsBreakdown = { cash: 0, gpay: 0 };
    paymentMethodsResult.forEach(item => {
      if (item.payment_method === 'cash') collectionsBreakdown.cash = item.total;
      if (item.payment_method === 'gpay') collectionsBreakdown.gpay = item.total;
    });

    // 2. Total Expenses (active expenses)
    const expensesResult = await query.get('SELECT SUM(amount) as total FROM expenses WHERE status = "active"');
    const totalExpenses = expensesResult?.total || 0;

    // Breakdown expenses by category
    const expenseCategoriesResult = await query.all(`
      SELECT category, SUM(amount) as total
      FROM expenses
      WHERE status = 'active'
      GROUP BY category
    `);
    const expensesBreakdown = {};
    expenseCategoriesResult.forEach(item => {
      expensesBreakdown[item.category] = item.total;
    });

    // 3. Net Balance
    const netBalance = totalCollections - totalExpenses;

    // 4. Pending registrations count
    const pendingUsers = await query.get('SELECT COUNT(*) as count FROM users WHERE status = "pending"');
    const pendingRegistrations = pendingUsers?.count || 0;

    // 5. Team wise collections & expenses summary
    const teamSummaryResult = await query.all(`
      SELECT
        t.id as team_id,
        t.name as team_name,
        COUNT(DISTINCT u.id) as player_count
      FROM teams t
      LEFT JOIN users u ON u.team_id = t.id AND u.role = 'player' AND u.deleted_at IS NULL
      GROUP BY t.id
    `);

    // Fetch team collections
    const teamCollections = await query.all(`
      SELECT u.team_id, SUM(p.amount) as total
      FROM payments p
      JOIN users u ON p.player_id = u.id
      WHERE u.team_id IS NOT NULL
      GROUP BY u.team_id
    `);
    const teamCollectionsMap = {};
    teamCollections.forEach(tc => {
      teamCollectionsMap[tc.team_id] = tc.total;
    });

    const teams = teamSummaryResult.map(t => ({
      teamId: t.team_id,
      teamName: t.team_name,
      playerCount: t.player_count,
      totalCollected: teamCollectionsMap[t.team_id] || 0
    }));

    // 6. User Balances list
    const playerBalances = await calculatePlayerFinancials();

    res.json({
      totalCollections,
      collectionsBreakdown,
      totalExpenses,
      expensesBreakdown,
      netBalance,
      pendingRegistrations,
      teams,
      playerBalances
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ message: 'Server error generating dashboard summary' });
  }
});

// Player-specific dashboard details
app.get('/api/dashboard/player/:playerId', authenticateToken, async (req, res) => {
  const playerId = req.params.playerId;

  // Verify access (can see own dashboard, admin can see any)
  if (req.user.role === 'player' && req.user.id !== playerId) {
    return res.status(403).json({ message: 'Access denied to other player details' });
  }

  try {
    const [financials] = await calculatePlayerFinancials(playerId);
    if (!financials) {
      return res.status(404).json({ message: 'Player financials not found' });
    }

    // Match participation records
    const matches = await query.all(`
      SELECT m.id as match_id, m.match_date, m.opponent_team, m.venue, m.match_type,
             mp.balls_played, mp.balls_bowled
      FROM match_participation mp
      JOIN matches m ON mp.match_id = m.id
      WHERE mp.player_id = ? AND m.status = 'completed'
      ORDER BY m.match_date DESC
    `, [playerId]);

    // Payment history
    const payments = await query.all(`
      SELECT * FROM payments
      WHERE player_id = ?
      ORDER BY payment_date DESC
    `, [playerId]);

    res.json({
      summary: financials,
      matches,
      payments
    });
  } catch (error) {
    console.error('Player dashboard error:', error);
    res.status(500).json({ message: 'Server error generating player dashboard' });
  }
});

// Start Server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Crickfin backend running on port ${PORT}`);
  });
}

export default app;
