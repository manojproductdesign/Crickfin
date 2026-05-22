/**
 * Crickfin DOM & API Test Suite
 * Tests all major routes, auth flows, CRUD operations, and data integrity
 * Run: node dom-test.mjs
 */

const BASE = 'http://localhost:5000/api';
let adminToken = '';
let playerToken = '';
let testPlayerId = '';
let testTeamId = '';
let testMatchId = '';
let testPaymentId = '';
let testExpenseId = '';

const PASS = '✅ PASS';
const FAIL = '❌ FAIL';
const SKIP = '⏭  SKIP';

let passed = 0, failed = 0, skipped = 0;

function log(status, name, detail = '') {
  const icon = status === 'pass' ? PASS : status === 'skip' ? SKIP : FAIL;
  console.log(`  ${icon}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (status === 'pass') passed++;
  else if (status === 'skip') skipped++;
  else failed++;
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let json;
  try { json = await res.json(); } catch { json = {}; }
  return { status: res.status, body: json };
}

function section(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  🏏  ${title}`);
  console.log('═'.repeat(60));
}

// ────────────────────────────────────────────────────────────
// 1. AUTH TESTS
// ────────────────────────────────────────────────────────────
async function testAuth() {
  section('Authentication Tests');

  // 1.1 Login with wrong password
  let r = await req('POST', '/auth/login', { email: 'admin@crickfin.com', password: 'wrongpass' });
  r.status === 400
    ? log('pass', 'Reject invalid password', `HTTP ${r.status}`)
    : log('fail', 'Reject invalid password', `Expected 400, got ${r.status}`);

  // 1.2 Login with missing fields
  r = await req('POST', '/auth/login', { email: 'admin@crickfin.com' });
  r.status === 400
    ? log('pass', 'Reject missing password field', `HTTP ${r.status}`)
    : log('fail', 'Reject missing password field', `Expected 400, got ${r.status}`);

  // 1.3 Admin login success
  r = await req('POST', '/auth/login', { email: 'admin@crickfin.com', password: 'admin123' });
  if (r.status === 200 && r.body.token) {
    adminToken = r.body.token;
    log('pass', 'Admin login success', `Role: ${r.body.user.role}`);
  } else {
    log('fail', 'Admin login success', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
  }

  // 1.4 Get current user profile
  r = await req('GET', '/auth/me', null, adminToken);
  r.status === 200 && r.body.email === 'admin@crickfin.com'
    ? log('pass', 'GET /auth/me returns admin profile', `Name: ${r.body.name}`)
    : log('fail', 'GET /auth/me returns admin profile', `HTTP ${r.status}`);

  // 1.5 Access protected route without token
  r = await req('GET', '/players', null, '');
  r.status === 401
    ? log('pass', 'Reject unauthenticated request', `HTTP ${r.status}`)
    : log('fail', 'Reject unauthenticated request', `Expected 401, got ${r.status}`);

  // 1.6 Register new player
  const ts = Date.now();
  r = await req('POST', '/auth/register', {
    name: `Test Player ${ts}`,
    email: `testplayer${ts}@crickfin.com`,
    phone: `9${String(ts).slice(-9)}`,
    password: 'TestPass1',
    role: 'player'
  });
  r.status === 201
    ? log('pass', 'Player self-registration', `HTTP ${r.status} — ${r.body.message}`)
    : log('fail', 'Player self-registration', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);

  // 1.7 Register with weak password (< 8 chars)
  r = await req('POST', '/auth/register', {
    name: 'Weak Pass User',
    email: `weak${ts}@test.com`,
    phone: `8${String(ts).slice(-9)}`,
    password: 'abc',
    role: 'player'
  });
  r.status === 400
    ? log('pass', 'Reject weak password (<8 chars)', `HTTP ${r.status}`)
    : log('fail', 'Reject weak password', `Expected 400, got ${r.status}`);

  // 1.8 Duplicate email registration
  r = await req('POST', '/auth/register', {
    name: 'Duplicate',
    email: 'admin@crickfin.com',
    phone: '7777777777',
    password: 'TestPass1',
    role: 'player'
  });
  r.status === 400
    ? log('pass', 'Reject duplicate email registration', `HTTP ${r.status}`)
    : log('fail', 'Reject duplicate email', `Expected 400, got ${r.status}`);
}

// ────────────────────────────────────────────────────────────
// 2. PLAYER MANAGEMENT TESTS
// ────────────────────────────────────────────────────────────
async function testPlayers() {
  section('Player Management Tests');

  // 2.1 Get all players
  let r = await req('GET', '/players', null, adminToken);
  r.status === 200 && Array.isArray(r.body)
    ? log('pass', 'GET /players returns array', `Count: ${r.body.length}`)
    : log('fail', 'GET /players returns array', `HTTP ${r.status}`);

  // 2.2 Add a player (admin)
  const ts = Date.now();
  r = await req('POST', '/players', {
    name: `DOM Test Player ${ts}`,
    email: `domtest${ts}@crickfin.com`,
    phone: `6${String(ts).slice(-9)}`,
    password: 'DomTest1'
  }, adminToken);
  if (r.status === 201) {
    testPlayerId = r.body.playerId;
    log('pass', 'POST /players — admin adds player', `ID: ${testPlayerId}`);
  } else {
    log('fail', 'POST /players — admin adds player', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
  }

  // 2.3 Add player with missing fields
  r = await req('POST', '/players', { name: 'Incomplete' }, adminToken);
  r.status === 400
    ? log('pass', 'Reject player with missing fields', `HTTP ${r.status}`)
    : log('fail', 'Reject player with missing fields', `Expected 400, got ${r.status}`);

  // 2.4 Search players by name
  r = await req('GET', '/players?search=Admin', null, adminToken);
  r.status === 200 && Array.isArray(r.body)
    ? log('pass', 'GET /players?search=Admin works', `Results: ${r.body.length}`)
    : log('fail', 'GET /players?search=Admin', `HTTP ${r.status}`);

  // 2.5 Filter by status=pending
  r = await req('GET', '/players?status=pending', null, adminToken);
  r.status === 200 && Array.isArray(r.body)
    ? log('pass', 'GET /players?status=pending filter works', `Pending: ${r.body.length}`)
    : log('fail', 'GET /players?status=pending', `HTTP ${r.status}`);

  // 2.6 Non-admin cannot add player
  r = await req('POST', '/players', {
    name: 'Unauthorized',
    email: `unauth${ts}@test.com`,
    phone: `5${String(ts).slice(-9)}`,
    password: 'TestPass1'
  }, '');
  r.status === 401
    ? log('pass', 'Non-auth cannot add player', `HTTP ${r.status}`)
    : log('fail', 'Non-auth cannot add player', `Expected 401, got ${r.status}`);

  // 2.7 Approve player registration
  if (testPlayerId) {
    r = await req('POST', '/auth/approve', { userId: testPlayerId, status: 'approved' }, adminToken);
    r.status === 200
      ? log('pass', 'Admin approves player', `HTTP ${r.status}`)
      : log('fail', 'Admin approves player', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
  } else {
    log('skip', 'Admin approves player', 'No test player created');
  }
}

// ────────────────────────────────────────────────────────────
// 3. TEAM MANAGEMENT TESTS
// ────────────────────────────────────────────────────────────
async function testTeams() {
  section('Team Management Tests');

  // 3.1 Get all teams
  let r = await req('GET', '/teams', null, adminToken);
  r.status === 200 && Array.isArray(r.body)
    ? log('pass', 'GET /teams returns array', `Count: ${r.body.length}`)
    : log('fail', 'GET /teams', `HTTP ${r.status}`);

  // 3.2 Create a team
  const teamName = `DOM Test Team ${Date.now()}`;
  r = await req('POST', '/teams', { name: teamName }, adminToken);
  if (r.status === 201) {
    testTeamId = r.body.teamId;
    log('pass', 'POST /teams creates team', `ID: ${testTeamId}`);
  } else {
    log('fail', 'POST /teams creates team', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
  }

  // 3.3 Create team with missing name
  r = await req('POST', '/teams', {}, adminToken);
  r.status === 400
    ? log('pass', 'Reject team with no name', `HTTP ${r.status}`)
    : log('fail', 'Reject team with no name', `Expected 400, got ${r.status}`);

  // 3.4 Assign player to team
  if (testPlayerId && testTeamId) {
    r = await req('POST', '/teams/assign', { playerId: testPlayerId, teamId: testTeamId }, adminToken);
    r.status === 200
      ? log('pass', 'Assign player to team', `HTTP ${r.status}`)
      : log('fail', 'Assign player to team', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
  } else {
    log('skip', 'Assign player to team', 'Missing player or team ID');
  }

  // 3.5 Remove player from team (assign null)
  if (testPlayerId) {
    r = await req('POST', '/teams/assign', { playerId: testPlayerId, teamId: null }, adminToken);
    r.status === 200
      ? log('pass', 'Remove player from team (null teamId)', `HTTP ${r.status}`)
      : log('fail', 'Remove player from team', `HTTP ${r.status}`);
    // Re-assign to team for later tests
    if (testTeamId) {
      await req('POST', '/teams/assign', { playerId: testPlayerId, teamId: testTeamId }, adminToken);
    }
  } else {
    log('skip', 'Remove player from team', 'No test player');
  }
}

// ────────────────────────────────────────────────────────────
// 4. MATCH MANAGEMENT TESTS
// ────────────────────────────────────────────────────────────
async function testMatches() {
  section('Match Management Tests');

  // 4.1 Get all matches
  let r = await req('GET', '/matches', null, adminToken);
  r.status === 200 && Array.isArray(r.body)
    ? log('pass', 'GET /matches returns array', `Count: ${r.body.length}`)
    : log('fail', 'GET /matches', `HTTP ${r.status}`);

  // 4.2 Create a match
  r = await req('POST', '/matches', {
    matchDate: '2026-06-15',
    opponentTeam: 'DOM Rivals FC',
    venue: 'Test Ground',
    matchType: 'league'
  }, adminToken);
  if (r.status === 201) {
    testMatchId = r.body.matchId;
    log('pass', 'POST /matches creates match', `ID: ${testMatchId}`);
  } else {
    log('fail', 'POST /matches creates match', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
  }

  // 4.3 Create match with missing fields
  r = await req('POST', '/matches', { matchDate: '2026-06-20' }, adminToken);
  r.status === 400
    ? log('pass', 'Reject match with missing fields', `HTTP ${r.status}`)
    : log('fail', 'Reject match with missing fields', `Expected 400, got ${r.status}`);

  // 4.4 Create match with invalid type
  r = await req('POST', '/matches', {
    matchDate: '2026-06-15',
    opponentTeam: 'Bad Type',
    venue: 'Ground',
    matchType: 'invalid_type'
  }, adminToken);
  // SQLite CHECK constraint will fail
  r.status !== 201
    ? log('pass', 'Reject invalid match type', `HTTP ${r.status}`)
    : log('fail', 'Reject invalid match type', `Should not have created match`);

  // 4.5 Update match status to completed
  if (testMatchId) {
    r = await req('PUT', `/matches/${testMatchId}`, { status: 'completed' }, adminToken);
    r.status === 200
      ? log('pass', 'Update match status → completed', `HTTP ${r.status}`)
      : log('fail', 'Update match status', `HTTP ${r.status}`);
  } else {
    log('skip', 'Update match status', 'No test match created');
  }

  // 4.6 Add participation records
  if (testMatchId && testPlayerId) {
    r = await req('POST', `/matches/${testMatchId}/participation`, {
      participations: [
        { playerId: testPlayerId, ballsBowled: 12, ballsPlayed: 24 }
      ]
    }, adminToken);
    r.status === 200
      ? log('pass', 'Set match participation', `HTTP ${r.status}`)
      : log('fail', 'Set match participation', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
  } else {
    log('skip', 'Set match participation', 'Missing match or player ID');
  }

  // 4.7 Get participation for match
  if (testMatchId) {
    r = await req('GET', `/matches/${testMatchId}/participation`, null, adminToken);
    r.status === 200 && Array.isArray(r.body)
      ? log('pass', 'GET match participation', `Records: ${r.body.length}`)
      : log('fail', 'GET match participation', `HTTP ${r.status}`);
  } else {
    log('skip', 'GET match participation', 'No match ID');
  }
}

// ────────────────────────────────────────────────────────────
// 5. PAYMENT TESTS
// ────────────────────────────────────────────────────────────
async function testPayments() {
  section('Payment Tests');

  // 5.1 Get all payments
  let r = await req('GET', '/payments', null, adminToken);
  r.status === 200 && Array.isArray(r.body)
    ? log('pass', 'GET /payments returns array', `Count: ${r.body.length}`)
    : log('fail', 'GET /payments', `HTTP ${r.status}`);

  // 5.2 Record a cash payment
  if (testPlayerId) {
    r = await req('POST', '/payments', {
      playerId: testPlayerId,
      amount: 500,
      paymentDate: '2026-06-01',
      paymentMethod: 'cash',
      allocation: 'general',
      remarks: 'DOM test payment'
    }, adminToken);
    if (r.status === 201) {
      testPaymentId = r.body.paymentId;
      log('pass', 'POST /payments — cash payment', `ID: ${testPaymentId}`);
    } else {
      log('fail', 'POST /payments — cash payment', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
    }
  } else {
    log('skip', 'POST /payments — cash payment', 'No test player');
  }

  // 5.3 GPay payment requires reference ID
  if (testPlayerId) {
    r = await req('POST', '/payments', {
      playerId: testPlayerId,
      amount: 200,
      paymentDate: '2026-06-02',
      paymentMethod: 'gpay',
      allocation: 'ball_fees'
      // No referenceId — should fail
    }, adminToken);
    r.status === 400
      ? log('pass', 'Reject GPay without reference ID', `HTTP ${r.status}`)
      : log('fail', 'Reject GPay without reference ID', `Expected 400, got ${r.status}`);
  } else {
    log('skip', 'Reject GPay without reference ID', 'No test player');
  }

  // 5.4 GPay payment with reference ID
  if (testPlayerId) {
    r = await req('POST', '/payments', {
      playerId: testPlayerId,
      amount: 300,
      paymentDate: '2026-06-03',
      paymentMethod: 'gpay',
      referenceId: 'TXNDOM123456',
      allocation: 'ball_fees'
    }, adminToken);
    r.status === 201
      ? log('pass', 'POST /payments — GPay with ref ID', `HTTP ${r.status}`)
      : log('fail', 'POST /payments — GPay with ref ID', `HTTP ${r.status}`);
  } else {
    log('skip', 'POST /payments — GPay with ref ID', 'No test player');
  }

  // 5.5 Filter payments by method
  r = await req('GET', '/payments?method=cash', null, adminToken);
  r.status === 200 && Array.isArray(r.body)
    ? log('pass', 'Filter payments by method=cash', `Count: ${r.body.length}`)
    : log('fail', 'Filter payments by method', `HTTP ${r.status}`);

  // 5.6 Record payment with missing fields
  r = await req('POST', '/payments', { amount: 100 }, adminToken);
  r.status === 400
    ? log('pass', 'Reject payment with missing fields', `HTTP ${r.status}`)
    : log('fail', 'Reject payment with missing fields', `Expected 400, got ${r.status}`);
}

// ────────────────────────────────────────────────────────────
// 6. EXPENSE TESTS
// ────────────────────────────────────────────────────────────
async function testExpenses() {
  section('Expense Tests');

  // 6.1 Get all expenses
  let r = await req('GET', '/expenses', null, adminToken);
  r.status === 200 && Array.isArray(r.body)
    ? log('pass', 'GET /expenses returns array', `Count: ${r.body.length}`)
    : log('fail', 'GET /expenses', `HTTP ${r.status}`);

  // 6.2 Log an expense
  r = await req('POST', '/expenses', {
    category: 'ground_fees',
    description: 'DOM Test Ground Booking',
    amount: 2000,
    expenseDate: '2026-06-05',
    paymentMethod: 'gpay'
  }, adminToken);
  if (r.status === 201) {
    testExpenseId = r.body.expenseId;
    log('pass', 'POST /expenses — log expense', `ID: ${testExpenseId}`);
  } else {
    log('fail', 'POST /expenses — log expense', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
  }

  // 6.3 Expense with missing fields
  r = await req('POST', '/expenses', { category: 'kits' }, adminToken);
  r.status === 400
    ? log('pass', 'Reject expense with missing fields', `HTTP ${r.status}`)
    : log('fail', 'Reject expense with missing fields', `Expected 400, got ${r.status}`);

  // 6.4 Edit expense and void it
  if (testExpenseId) {
    r = await req('PUT', `/expenses/${testExpenseId}`, { status: 'void' }, adminToken);
    r.status === 200
      ? log('pass', 'Void an expense', `HTTP ${r.status}`)
      : log('fail', 'Void an expense', `HTTP ${r.status}`);
  } else {
    log('skip', 'Void an expense', 'No test expense created');
  }

  // 6.5 Filter expenses by category
  r = await req('GET', '/expenses?category=ground_fees', null, adminToken);
  r.status === 200 && Array.isArray(r.body)
    ? log('pass', 'Filter expenses by category', `Count: ${r.body.length}`)
    : log('fail', 'Filter expenses by category', `HTTP ${r.status}`);
}

// ────────────────────────────────────────────────────────────
// 7. BALL FEES CONFIG TESTS
// ────────────────────────────────────────────────────────────
async function testBallFees() {
  section('Ball Fees Configuration Tests');

  // 7.1 Get current config
  let r = await req('GET', '/ball-fees/config', null, adminToken);
  r.status === 200 && r.body.cost_per_ball !== undefined
    ? log('pass', 'GET /ball-fees/config', `Cost per ball: ₹${r.body.cost_per_ball}`)
    : log('fail', 'GET /ball-fees/config', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);

  // 7.2 Update config
  r = await req('POST', '/ball-fees/config', { costPerBall: 15 }, adminToken);
  r.status === 200
    ? log('pass', 'POST /ball-fees/config — update cost', `New cost: ₹15`)
    : log('fail', 'POST /ball-fees/config — update cost', `HTTP ${r.status}`);

  // 7.3 Reject negative cost
  r = await req('POST', '/ball-fees/config', { costPerBall: -5 }, adminToken);
  r.status === 400
    ? log('pass', 'Reject negative ball fee cost', `HTTP ${r.status}`)
    : log('fail', 'Reject negative ball fee cost', `Expected 400, got ${r.status}`);
}

// ────────────────────────────────────────────────────────────
// 8. DASHBOARD TESTS
// ────────────────────────────────────────────────────────────
async function testDashboard() {
  section('Dashboard & Financial Summary Tests');

  // 8.1 Admin dashboard summary
  let r = await req('GET', '/dashboard/summary', null, adminToken);
  if (r.status === 200) {
    const d = r.body;
    const hasKeys = ['totalCollections', 'totalExpenses', 'netBalance', 'pendingRegistrations', 'teams', 'playerBalances']
      .every(k => k in d);
    hasKeys
      ? log('pass', 'GET /dashboard/summary has all keys', `Collections: ₹${d.totalCollections}, Balance: ₹${d.netBalance}`)
      : log('fail', 'GET /dashboard/summary has all keys', `Missing keys in: ${JSON.stringify(Object.keys(d))}`);
  } else {
    log('fail', 'GET /dashboard/summary', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
  }

  // 8.2 Net balance calculation
  r = await req('GET', '/dashboard/summary', null, adminToken);
  if (r.status === 200) {
    const { totalCollections, totalExpenses, netBalance } = r.body;
    const expectedNet = totalCollections - totalExpenses;
    Math.abs(netBalance - expectedNet) < 0.01
      ? log('pass', 'Net balance = collections − expenses', `₹${totalCollections} - ₹${totalExpenses} = ₹${netBalance}`)
      : log('fail', 'Net balance calculation', `Expected ₹${expectedNet}, got ₹${netBalance}`);
  } else {
    log('skip', 'Net balance calculation', 'Dashboard fetch failed');
  }

  // 8.3 Player dashboard
  if (testPlayerId) {
    r = await req('GET', `/dashboard/player/${testPlayerId}`, null, adminToken);
    r.status === 200 && r.body.summary
      ? log('pass', `GET /dashboard/player/${testPlayerId}`, `Due: ₹${r.body.summary.totalDue}, Paid: ₹${r.body.summary.totalPaid}`)
      : log('fail', 'GET /dashboard/player/:id', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
  } else {
    log('skip', 'GET /dashboard/player/:id', 'No test player');
  }

  // 8.4 Player balance counts ball fees correctly
  if (testPlayerId) {
    r = await req('GET', `/dashboard/player/${testPlayerId}`, null, adminToken);
    if (r.status === 200 && r.body.summary) {
      const { ballFeesDue, ballFeesPaid, ballFeesBalance } = r.body.summary;
      const expectedBal = ballFeesDue - ballFeesPaid;
      Math.abs(ballFeesBalance - expectedBal) < 0.01
        ? log('pass', 'Ball fees balance = due − paid', `Due ₹${ballFeesDue} − Paid ₹${ballFeesPaid} = ₹${ballFeesBalance}`)
        : log('fail', 'Ball fees balance calculation', `Expected ₹${expectedBal}, got ₹${ballFeesBalance}`);
    } else {
      log('skip', 'Ball fees balance calculation', 'Player dashboard unavailable');
    }
  } else {
    log('skip', 'Ball fees balance calculation', 'No test player');
  }
}

// ────────────────────────────────────────────────────────────
// 9. SOFT DELETE & DATA INTEGRITY TESTS
// ────────────────────────────────────────────────────────────
async function testIntegrity() {
  section('Data Integrity & Soft Delete Tests');

  // 9.1 Soft delete player
  if (testPlayerId) {
    let r = await req('DELETE', `/players/${testPlayerId}`, null, adminToken);
    r.status === 200
      ? log('pass', 'Soft delete player', `HTTP ${r.status}`)
      : log('fail', 'Soft delete player', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
  } else {
    log('skip', 'Soft delete player', 'No test player');
  }

  // 9.2 Deleted player not in player list
  if (testPlayerId) {
    let r = await req('GET', '/players', null, adminToken);
    const found = r.body.find(p => p.id === testPlayerId);
    !found
      ? log('pass', 'Soft-deleted player excluded from list', 'Not found in active players')
      : log('fail', 'Soft-deleted player excluded from list', 'Still appears in player list');
  } else {
    log('skip', 'Soft-deleted player exclusion', 'No test player');
  }

  // 9.3 Payments for soft-deleted player still visible in admin view
  if (testPlayerId) {
    let r = await req('GET', `/payments?playerId=${testPlayerId}`, null, adminToken);
    r.status === 200
      ? log('pass', 'Payments for deleted player still accessible', `Count: ${r.body.length}`)
      : log('fail', 'Payments for deleted player', `HTTP ${r.status}`);
  } else {
    log('skip', 'Payments for deleted player', 'No test player');
  }

  // 9.4 Rate limit headers present
  let r = await req('GET', '/players', null, adminToken);
  // Just verify the response is valid (rate limit headers are in response headers, not testable via fetch response.body)
  r.status === 200
    ? log('pass', 'API responds with 200 under normal load', `HTTP ${r.status}`)
    : log('fail', 'API normal response', `HTTP ${r.status}`);
}

// ────────────────────────────────────────────────────────────
// RUN ALL TESTS
// ────────────────────────────────────────────────────────────
async function runAll() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       CRICKFIN DOM & API TEST SUITE                     ║');
  console.log('║       Target: http://localhost:5000/api                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    await testAuth();
    await testPlayers();
    await testTeams();
    await testMatches();
    await testPayments();
    await testExpenses();
    await testBallFees();
    await testDashboard();
    await testIntegrity();
  } catch (err) {
    console.error('\n🔥 FATAL ERROR:', err.message);
  }

  const total = passed + failed + skipped;
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped (${total} total)${' '.repeat(Math.max(0, 17 - String(passed + failed + skipped).length))}║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  if (failed > 0) process.exit(1);
}

runAll();
