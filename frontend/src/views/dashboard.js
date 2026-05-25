import { store } from '../state.js';
import { renderLayout, bindLayoutEvents } from './layout.js';
import { navigateTo } from '../router.js';
import {
  ICON_SPINNER,
  ICON_PAYMENTS,
  ICON_EXPENSES,
  ICON_REPORTS,
  ICON_WARNING,
  ICON_RECEIPT,
  ICON_COINS,
  ICON_HOURGLASS
} from '../assets/icons.js';

export async function renderAdminDashboard() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  appEl.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
      <div style="text-align: center; color: var(--text-muted);">
        <div style="margin-bottom: 12px; display: flex; justify-content: center;">${ICON_SPINNER}</div>
        Loading dashboard metrics...
      </div>
    </div>
  `;

  try {
    const data = await store.fetchDashboard();
    
    // Additional Admin metrics calculations
    const totalPlayersCount = data.playerBalances.length;
    const totalOutstandingDues = data.playerBalances.reduce((sum, pb) => sum + (pb.totalBalance > 0 ? pb.totalBalance : 0), 0);
    const activeTeamsCount = data.teams ? data.teams.length : 0;
    const expensePercentage = data.totalCollections > 0 
      ? Math.min(100, Math.round((data.totalExpenses / data.totalCollections) * 100))
      : 0;

    // Admin dashboard layout HTML
    const content = `
      <!-- Premium Metrics Overview -->
      <div class="stats-grid">
        <!-- Collection Card -->
        <a href="#payments" class="card stat-card card-interactive" style="display: block; text-decoration: none; color: inherit;">
          <div class="stat-header">
            <span>TOTAL COLLECTIONS</span>
            <span style="color: var(--success);">${ICON_PAYMENTS}</span>
          </div>
          <div class="stat-value">₹${data.totalCollections.toLocaleString()}</div>
          <div class="stat-change tech-label">
            Cash: ₹${data.collectionsBreakdown.cash} | GPay: ₹${data.collectionsBreakdown.gpay}
          </div>
        </a>

        <!-- Expenses Card -->
        <a href="#expenses" class="card stat-card card-interactive" style="display: block; text-decoration: none; color: inherit;">
          <div class="stat-header">
            <span>TOTAL EXPENSES</span>
            <span style="color: var(--danger);">${ICON_EXPENSES}</span>
          </div>
          <div class="stat-value" style="color: var(--danger);">₹${data.totalExpenses.toLocaleString()}</div>
          <div class="stat-change tech-label" style="display: flex; align-items: center; gap: 8px; justify-content: space-between;">
            <span>Spent: ${expensePercentage}%</span>
            <div style="flex-grow: 1; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; margin-left: 8px;">
              <div style="width: ${expensePercentage}%; height: 100%; background: var(--danger);"></div>
            </div>
          </div>
        </a>

        <!-- Balance Card -->
        <a href="#reports" class="card stat-card card-interactive" style="display: block; text-decoration: none; color: inherit;">
          <div class="stat-header">
            <span>NET BALANCE</span>
            <span style="color: var(--info);">${ICON_REPORTS}</span>
          </div>
          <div class="stat-value" style="color: ${data.netBalance >= 0 ? 'var(--success)' : 'var(--danger)'};">
            ₹${data.netBalance.toLocaleString()}
          </div>
          <div class="stat-change tech-label">
            Collections minus Expenses
          </div>
        </a>

        <!-- Outstanding Dues Card -->
        <div class="card stat-card">
          <div class="stat-header">
            <span>OUTSTANDING DUES</span>
            <span style="color: var(--warning);">${ICON_HOURGLASS}</span>
          </div>
          <div class="stat-value" style="color: var(--warning);">₹${totalOutstandingDues.toLocaleString()}</div>
          <div class="stat-change tech-label">
            From players with remaining balances
          </div>
        </div>
      </div>

      <!-- Quick Summary Badges -->
      <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-top: 16px; margin-bottom: 8px;">
        <div class="badge badge-info" style="display: inline-flex; align-items: center; padding: 6px 12px; gap: 6px; border-radius: 9999px;">
          <span>Registered Players:</span> <strong>${totalPlayersCount}</strong>
        </div>
        <div class="badge badge-info" style="display: inline-flex; align-items: center; padding: 6px 12px; gap: 6px; border-radius: 9999px;">
          <span>Active Teams:</span> <strong>${activeTeamsCount}</strong>
        </div>
        ${data.pendingRegistrations > 0 ? `
          <a href="#players" class="badge badge-danger" style="display: inline-flex; align-items: center; padding: 6px 12px; gap: 6px; border-radius: 9999px; text-decoration: none;">
            <span>Pending Approvals:</span> <strong>${data.pendingRegistrations}</strong>
          </a>
        ` : `
          <div class="badge badge-success" style="display: inline-flex; align-items: center; padding: 6px 12px; gap: 6px; border-radius: 9999px;">
            <span>Approvals Queue:</span> <strong>Cleared</strong>
          </div>
        `}
      </div>

      <!-- Quick Actions and Approvals -->
      <div class="grid-2" style="margin-top: 24px;">
        <!-- Quick Actions Panel -->
        <div class="card">
          <h3 class="card-title">Quick Actions</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;">
            <a href="#payments" class="btn btn-primary" style="display: inline-flex; align-items: center; justify-content: center; text-decoration: none;">Record Payment</a>
            <a href="#expenses" class="btn btn-secondary" style="display: inline-flex; align-items: center; justify-content: center; text-decoration: none;">Log Expense</a>
            <a href="#matches" class="btn btn-secondary" style="display: inline-flex; align-items: center; justify-content: center; text-decoration: none;">Schedule Match</a>
            <a href="#players" class="btn btn-secondary" style="display: inline-flex; align-items: center; justify-content: center; text-decoration: none;">Add Player</a>
          </div>
        </div>

        <!-- Pending Registrations Queue -->
        <div class="card">
          <h3 class="card-title">Pending Approvals</h3>
          <div id="pending-users-list" style="margin-top: 12px;">
            Loading approvals...
          </div>
        </div>
      </div>

      <!-- Player Balance Ledger with Client-Side Search Filters -->
      <div class="card" style="margin-top: 24px;">
        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <h3 class="card-title">Player Balance Ledger</h3>
            <a href="#reports" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; text-decoration: none;">View Reports</a>
          </div>
          
          <!-- Search & Filter Controls -->
          <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px;">
            <div style="flex: 1; min-width: 240px; position: relative;">
              <input type="text" id="ledger-search" class="form-control" placeholder="Search players by name or phone..." style="padding-right: 30px; margin-bottom: 0;" />
            </div>
            <div>
              <select id="ledger-status-filter" class="form-control" style="width: auto; margin-bottom: 0;">
                <option value="all">All Players</option>
                <option value="dues">Outstanding Dues Only</option>
                <option value="cleared">Cleared Balances Only</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Player Name</th>
                <th>Matches</th>
                <th>Ball Fees Due</th>
                <th>Ball Fees Paid</th>
                <th>Ball Fees Bal</th>
                <th>General Due</th>
                <th>General Paid</th>
                <th>General Bal</th>
                <th>Total Balance</th>
              </tr>
            </thead>
            <tbody id="ledger-tbody">
              ${data.playerBalances.length === 0 ? `
                <tr class="no-results-row">
                  <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 20px;">No players registered yet.</td>
                </tr>
              ` : data.playerBalances.map(pb => `
                <tr class="ledger-row" data-name="${pb.name.toLowerCase()}" data-phone="${pb.phone}" data-balance="${pb.totalBalance}">
                  <td><strong>${pb.name}</strong><br><small class="tech-label" style="font-size: 0.7rem;">${pb.phone}</small></td>
                  <td style="font-family: var(--font-mono);">${pb.matchesPlayed}</td>
                  <td style="font-family: var(--font-mono);">₹${pb.ballFeesDue}</td>
                  <td style="font-family: var(--font-mono);">₹${pb.ballFeesPaid}</td>
                  <td style="font-family: var(--font-mono);"><span style="color: ${pb.ballFeesBalance > 0 ? 'var(--warning)' : 'var(--text-muted)'};">₹${pb.ballFeesBalance}</span></td>
                  <td style="font-family: var(--font-mono);">₹${pb.generalFeesDue}</td>
                  <td style="font-family: var(--font-mono);">₹${pb.generalPaid}</td>
                  <td style="font-family: var(--font-mono);"><span style="color: ${pb.generalBalance > 0 ? 'var(--warning)' : 'var(--text-muted)'};">₹${pb.generalBalance}</span></td>
                  <td style="font-family: var(--font-mono);">
                    <span class="badge ${pb.totalBalance > 0 ? 'badge-danger' : 'badge-success'}">
                      ₹${pb.totalBalance}
                    </span>
                  </td>
                </tr>
              `).join('')}
              <tr id="empty-search-row" style="display: none;">
                <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">No players match your search filter.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    appEl.innerHTML = renderLayout(content, 'dashboard');
    bindLayoutEvents();
    bindAdminDashboardEvents();
    
    // Render approvals queue
    renderPendingApprovals(data.playerBalances);
  } catch (error) {
    appEl.innerHTML = renderLayout(`
      <div class="alert alert-danger">
        Failed to fetch dashboard data: ${error.message}
      </div>
    `, 'dashboard');
    bindLayoutEvents();
  }
}

function bindAdminDashboardEvents() {
  const searchInput = document.getElementById('ledger-search');
  const statusFilter = document.getElementById('ledger-status-filter');
  const tbody = document.getElementById('ledger-tbody');

  if (searchInput && statusFilter && tbody) {
    const rows = Array.from(tbody.querySelectorAll('.ledger-row'));
    const emptyRow = document.getElementById('empty-search-row');

    const filterLedger = () => {
      const searchVal = searchInput.value.toLowerCase().trim();
      const statusVal = statusFilter.value;
      let visibleCount = 0;

      rows.forEach(row => {
        const name = row.getAttribute('data-name');
        const phone = row.getAttribute('data-phone');
        const balance = parseFloat(row.getAttribute('data-balance'));

        const matchesSearch = name.includes(searchVal) || phone.includes(searchVal);
        
        let matchesStatus = true;
        if (statusVal === 'dues') {
          matchesStatus = balance > 0;
        } else if (statusVal === 'cleared') {
          matchesStatus = balance <= 0;
        }

        if (matchesSearch && matchesStatus) {
          row.style.display = '';
          visibleCount++;
        } else {
          row.style.display = 'none';
        }
      });

      if (rows.length > 0) {
        if (visibleCount === 0) {
          emptyRow.style.display = '';
        } else {
          emptyRow.style.display = 'none';
        }
      }
    };

    searchInput.addEventListener('input', filterLedger);
    statusFilter.addEventListener('change', filterLedger);
  }
}

async function renderPendingApprovals(allPlayers) {
  const container = document.getElementById('pending-users-list');
  if (!container) return;

  try {
    const pending = await store.fetchPlayers('', '', 'pending', 'all');
    
    if (pending.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">No pending approvals.</p>`;
      return;
    }

    container.innerHTML = pending.map(user => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-size: 0.9rem;">${user.name}</strong>
            <span class="badge ${user.role === 'admin' ? 'badge-danger' : 'badge-info'}" style="font-size: 0.7rem; padding: 2px 6px; text-transform: uppercase;">${user.role}</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">${user.email} | ${user.phone}</div>
        </div>
        <button class="btn btn-primary btn-sm approve-btn" data-id="${user.id}" aria-label="Approve registration for ${user.name}">Approve</button>
      </div>
    `).join('');

    container.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        e.target.disabled = true;
        e.target.textContent = '...';
        try {
          await store.apiRequest('/auth/approve', 'POST', { userId: id, status: 'approved' });
          renderAdminDashboard();
        } catch (err) {
          alert('Approval failed: ' + err.message);
          e.target.disabled = false;
          e.target.textContent = 'Approve';
        }
      });
    });
  } catch (error) {
    container.innerHTML = `<p style="color: var(--danger); font-size: 0.9rem;">Failed to load approvals.</p>`;
  }
}

export async function renderPlayerDashboard() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  appEl.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
      <div style="text-align: center; color: var(--text-muted);">
        <div style="margin-bottom: 12px; display: flex; justify-content: center;">${ICON_SPINNER}</div>
        Loading your player ledger...
      </div>
    </div>
  `;

  try {
    const data = await store.fetchDashboard();
    const summary = data.summary;

    const paidRatio = summary.totalDue > 0
      ? Math.min(100, Math.round((summary.totalPaid / summary.totalDue) * 100))
      : 100;

    const content = `
      ${summary.totalBalance > 0 ? `
        <div class="alert alert-danger" style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <strong>Outstanding balance: ₹${summary.totalBalance.toLocaleString()}</strong>
            <div style="font-size: 0.8rem; margin-top: 2px; opacity: 0.85;">
              You have pending fees for matches and balls. Please clear them with the league admin.
            </div>
          </div>
          <a href="#settings" class="btn btn-secondary btn-sm" style="text-decoration: none;">View profile settings</a>
        </div>
      ` : `
        <div class="alert alert-success" style="margin-bottom: 24px;">
          <strong>All dues cleared!</strong> Excellent! Your financial record is fully up-to-date. Thank you!
        </div>
      `}

      <div class="stats-grid">
        <div class="card stat-card">
          <div class="stat-header">
            <span>TOTAL DUES CHARGED</span>
            <span style="color: var(--warning);">${ICON_RECEIPT}</span>
          </div>
          <div class="stat-value">₹${summary.totalDue}</div>
          <div class="stat-change tech-label">
            Matches: ₹${summary.generalFeesDue} | Balls: ₹${summary.ballFeesDue}
          </div>
        </div>

        <div class="card stat-card">
          <div class="stat-header">
            <span>TOTAL PAID</span>
            <span style="color: var(--success);">${ICON_COINS}</span>
          </div>
          <div class="stat-value" style="color: var(--success);">₹${summary.totalPaid}</div>
          <div class="stat-change tech-label">
            General: ₹${summary.generalPaid} | Balls: ₹${summary.ballFeesPaid}
          </div>
        </div>

        <div class="card stat-card">
          <div class="stat-header">
            <span>OUTSTANDING BALANCE</span>
            <span style="color: var(--warning);">${ICON_HOURGLASS}</span>
          </div>
          <div class="stat-value" style="color: ${summary.totalBalance > 0 ? 'var(--warning)' : 'var(--success)'};">
            ₹${summary.totalBalance}
          </div>
          <div class="stat-change tech-label">
            General: ₹${summary.generalBalance} | Balls: ₹${summary.ballFeesBalance}
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 24px; padding: 20px;">
        <h3 class="card-title" style="margin-bottom: 12px; font-size: 1rem; color: var(--text-muted);">Payment Clearance Ratio</h3>
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="flex-grow: 1; height: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; overflow: hidden; position: relative;">
            <div style="width: ${paidRatio}%; height: 100%; background: linear-gradient(90deg, #059669, #10b981); border-radius: 6px;"></div>
          </div>
          <span style="font-family: var(--font-mono); font-size: 1.1rem; font-weight: bold; color: var(--success);">${paidRatio}% Paid</span>
        </div>
      </div>

      <div class="grid-2" style="margin-top: 24px;">
        <div class="card">
          <h3 class="card-title">Match Participation History</h3>
          <div class="table-container" style="max-height: 380px; overflow-y: auto;">
            <table>
              <thead>
                <tr>
                  <th>Opponent</th>
                  <th>Date</th>
                  <th>Balls Bowled</th>
                  <th>Balls Played</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                ${data.matches.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No matches played yet.</td>
                  </tr>
                ` : data.matches.map(m => `
                  <tr>
                    <td><strong>${m.opponent_team}</strong><br><small class="tech-label" style="font-size: 0.7rem;">${m.venue}</small></td>
                    <td style="font-family: var(--font-mono);">${m.match_date}</td>
                    <td style="font-family: var(--font-mono);">${m.balls_bowled}</td>
                    <td style="font-family: var(--font-mono);">${m.balls_played}</td>
                    <td><span class="badge badge-info">${m.match_type}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">My Payment History</h3>
          <div class="table-container" style="max-height: 380px; overflow-y: auto;">
            <table>
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Ref ID</th>
                  <th>Allocation</th>
                </tr>
              </thead>
              <tbody>
                ${data.payments.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No payments recorded yet.</td>
                  </tr>
                ` : data.payments.map(p => `
                  <tr>
                    <td style="font-family: var(--font-mono);"><strong style="color: var(--success);">₹${p.amount}</strong></td>
                    <td style="font-family: var(--font-mono);">${p.payment_date}</td>
                    <td><span class="badge ${p.payment_method === 'gpay' ? 'badge-success' : 'badge-warning'}">${p.payment_method}</span></td>
                    <td><small class="tech-label" style="font-size: 0.7rem;">${p.reference_id || 'N/A'}</small></td>
                    <td><span style="font-size: 0.8rem; text-transform: capitalize;">${p.allocation.replace('_', ' ')}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    appEl.innerHTML = renderLayout(content, 'player-dashboard');
    bindLayoutEvents();
  } catch (error) {
    appEl.innerHTML = renderLayout(`
      <div class="alert alert-danger">
        Failed to fetch player ledger: ${error.message}
      </div>
    `, 'player-dashboard');
    bindLayoutEvents();
  }
}
