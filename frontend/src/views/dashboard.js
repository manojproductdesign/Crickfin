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
    
    // Admin dashboard layout HTML
    const content = `
      <div class="stats-grid">
        <!-- Collection Card -->
        <div class="card stat-card card-interactive" onclick="window.location.hash='#payments'">
          <div class="stat-header">
            <span>TOTAL COLLECTIONS</span>
            <span style="color: var(--success);">${ICON_PAYMENTS}</span>
          </div>
          <div class="stat-value">₹${data.totalCollections.toLocaleString()}</div>
          <div class="stat-change tech-label">
            Cash: ₹${data.collectionsBreakdown.cash} | GPay: ₹${data.collectionsBreakdown.gpay}
          </div>
        </div>

        <!-- Expenses Card -->
        <div class="card stat-card card-interactive" onclick="window.location.hash='#expenses'">
          <div class="stat-header">
            <span>TOTAL EXPENSES</span>
            <span style="color: var(--danger);">${ICON_EXPENSES}</span>
          </div>
          <div class="stat-value" style="color: var(--danger);">₹${data.totalExpenses.toLocaleString()}</div>
          <div class="stat-change tech-label">
            Active purchases logged
          </div>
        </div>

        <!-- Balance Card -->
        <div class="card stat-card card-interactive" onclick="window.location.hash='#reports'">
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
        </div>

        <!-- Pending Approvals Card -->
        <div class="card stat-card card-interactive" onclick="window.location.hash='#players'">
          <div class="stat-header">
            <span>PENDING REGISTRATIONS</span>
            <span style="color: var(--warning);">${ICON_WARNING}</span>
          </div>
          <div class="stat-value">${data.pendingRegistrations}</div>
          <div class="stat-change tech-label" style="color: ${data.pendingRegistrations > 0 ? 'var(--warning)' : 'var(--text-muted)'};">
            ${data.pendingRegistrations > 0 ? 'Action required' : 'System up-to-date'}
          </div>
        </div>
      </div>

      <!-- Quick Actions and Approvals -->
      <div class="grid-2" style="margin-top: 24px;">
        <!-- Quick Actions Panel -->
        <div class="card">
          <h3 class="card-title">Quick Actions</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;">
            <button class="btn btn-primary" onclick="window.location.hash='#payments'">Record Payment</button>
            <button class="btn btn-secondary" onclick="window.location.hash='#expenses'">Log Expense</button>
            <button class="btn btn-secondary" onclick="window.location.hash='#matches'">Schedule Match</button>
            <button class="btn btn-secondary" onclick="window.location.hash='#players'">Add Player</button>
          </div>
        </div>

        <!-- Pending Registrations Queue -->
        <div class="card">
          <h3 class="card-title">Pending Approvals</h3>
          <div id="pending-users-list" style="margin-top: 12px;">
            <!-- Render dynamically -->
            Loading approvals...
          </div>
        </div>
      </div>

      <!-- Player Balance Ledger -->
      <div class="card" style="margin-top: 24px;">
        <h3 class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Player Balance Ledger</span>
          <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#reports'">View Reports</button>
        </h3>
        
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
            <tbody>
              ${data.playerBalances.length === 0 ? `
                <tr>
                  <td colspan="9" style="text-align: center; color: var(--text-muted);">No players registered yet.</td>
                </tr>
              ` : data.playerBalances.map(pb => `
                <tr>
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
            </tbody>
          </table>
        </div>
      </div>
    `;

    appEl.innerHTML = renderLayout(content, 'dashboard');
    bindLayoutEvents();
    
    // Now render pending registrations
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

async function renderPendingApprovals(allPlayers) {
  const container = document.getElementById('pending-users-list');
  if (!container) return;

  try {
    // We can fetch players with status pending
    const pending = await store.fetchPlayers('', '', 'pending');
    
    if (pending.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">No pending approvals.</p>`;
      return;
    }

    container.innerHTML = pending.map(user => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px;">
        <div>
          <strong style="font-size: 0.9rem;">${user.name}</strong>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${user.email} | ${user.phone}</div>
        </div>
        <button class="btn btn-primary btn-sm approve-btn" data-id="${user.id}">Approve</button>
      </div>
    `).join('');

    // Bind approval click
    container.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        e.target.disabled = true;
        e.target.textContent = '...';
        try {
          await store.apiRequest('/auth/approve', 'POST', { userId: id, status: 'approved' });
          // Reload
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
    const data = await store.fetchDashboard(); // fetches activePlayerDashboard for players
    const summary = data.summary;

    const content = `
      <div class="stats-grid">
        <!-- Total Fees Due -->
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

        <!-- Total Paid -->
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

        <!-- Remaining Balance -->
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

      <div class="grid-2" style="margin-top: 24px;">
        <!-- Match History -->
        <div class="card">
          <h3 class="card-title">Match Participation History</h3>
          <div class="table-container">
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

        <!-- Payment History -->
        <div class="card">
          <h3 class="card-title">My Payment History</h3>
          <div class="table-container">
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
