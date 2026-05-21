import { store } from '../state.js';
import { renderLayout, bindLayoutEvents } from './layout.js';
import {
  ICON_SPINNER,
  ICON_DOWNLOAD,
  ICON_PRINT,
  ICON_TREND_UP,
  ICON_TREND_DOWN,
  ICON_REPORTS
} from '../assets/icons.js';

export async function renderReports() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  appEl.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
      <div style="text-align: center; color: var(--text-muted);">
        <div style="margin-bottom: 12px; display: flex; justify-content: center;">${ICON_SPINNER}</div>
        Generating financial reports...
      </div>
    </div>
  `;

  try {
    // Fetch initial datasets
    const [dashboard, players, teams, matches] = await Promise.all([
      store.fetchDashboard(),
      store.fetchPlayers(),
      store.fetchTeams(),
      store.fetchMatches()
    ]);

    // Fetch payments
    const payments = await store.apiRequest('/payments');
    // Fetch expenses
    const expenses = await store.apiRequest('/expenses');

    renderReportsDashboard(appEl, dashboard, players, teams, matches, payments, expenses);
  } catch (error) {
    appEl.innerHTML = renderLayout(`
      <div class="alert alert-danger">
        Failed to fetch report data: ${error.message}
      </div>
    `, 'reports');
    bindLayoutEvents();
  }
}

function renderReportsDashboard(appEl, dashboard, players, teams, matches, payments, expenses, dateStart = '', dateEnd = '') {
  // Apply date range filters if present
  let filteredPayments = [...payments];
  let filteredExpenses = [...expenses];

  if (dateStart) {
    filteredPayments = filteredPayments.filter(p => p.payment_date >= dateStart);
    filteredExpenses = filteredExpenses.filter(e => e.expense_date >= dateStart);
  }
  if (dateEnd) {
    filteredPayments = filteredPayments.filter(p => p.payment_date <= dateEnd);
    filteredExpenses = filteredExpenses.filter(e => e.expense_date <= dateEnd);
  }

  // Recalculate totals based on dates
  const totalCollections = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const collectionsCash = filteredPayments.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + p.amount, 0);
  const collectionsGPay = filteredPayments.filter(p => p.payment_method === 'gpay').reduce((sum, p) => sum + p.amount, 0);

  const totalExpenses = filteredExpenses.filter(e => e.status === 'active').reduce((sum, e) => sum + e.amount, 0);
  
  // Expenses breakdown by category
  const expensesBreakdown = {};
  filteredExpenses.filter(e => e.status === 'active').forEach(e => {
    expensesBreakdown[e.category] = (expensesBreakdown[e.category] || 0) + e.amount;
  });

  const netBalance = totalCollections - totalExpenses;

  // Chronological transactions log
  const transactions = [];
  filteredPayments.forEach(p => {
    transactions.push({
      id: p.id,
      date: p.payment_date,
      type: 'Payment',
      name: p.player_name || 'Soft-deleted Player',
      amount: p.amount,
      method: p.payment_method,
      details: p.allocation === 'ball_fees' ? `Ball Fees - Ref: ${p.reference_id || 'N/A'}` : `General - Remarks: ${p.remarks || 'None'}`,
      isPositive: true
    });
  });

  filteredExpenses.forEach(e => {
    transactions.push({
      id: e.id,
      date: e.expense_date,
      type: 'Expense',
      name: `Expense: ${e.category.replace('_', ' ')} (${e.description})`,
      amount: e.amount,
      method: e.payment_method,
      details: e.status === 'void' ? 'VOIDED' : 'Active',
      isPositive: false,
      isVoided: e.status === 'void'
    });
  });

  // Sort chronological log
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  const content = `
    <!-- Top actions bar for reports -->
    <div class="card no-print" style="margin-bottom: 24px;">
      <h3 class="card-title">Report Controls</h3>
      <div class="filter-bar" style="display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap;">
        <div class="form-group" style="margin: 0; min-width: 150px;">
          <label>Start Date</label>
          <input type="date" id="report-start-date" class="form-control" value="${dateStart}">
        </div>
        <div class="form-group" style="margin: 0; min-width: 150px;">
          <label>End Date</label>
          <input type="date" id="report-end-date" class="form-control" value="${dateEnd}">
        </div>
        <div>
          <button class="btn btn-primary" id="apply-report-filters">Apply Filters</button>
          <button class="btn btn-secondary" id="reset-report-filters">Reset</button>
        </div>
        <div style="margin-left: auto; display: flex; gap: 10px;">
          <button class="btn btn-secondary" id="export-csv-ledger" style="display: inline-flex; align-items: center; gap: 6px;">
            ${ICON_DOWNLOAD} <span>CSV Ledger</span>
          </button>
          <button class="btn btn-secondary" id="export-csv-txs" style="display: inline-flex; align-items: center; gap: 6px;">
            ${ICON_DOWNLOAD} <span>CSV Transactions</span>
          </button>
          <button class="btn btn-primary" id="print-report-btn" style="display: inline-flex; align-items: center; gap: 6px;">
            ${ICON_PRINT} <span>Print / Save PDF</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Print-only Report Header -->
    <div class="print-only" style="display: none; text-align: center; margin-bottom: 30px;">
      <h1 style="color: #000; margin-bottom: 5px;">Crickfin League Manager</h1>
      <h3 style="color: #666; margin-bottom: 10px;">Official League Financial Report</h3>
      <p style="color: #444; font-size: 0.9rem;">
        Period: ${dateStart || 'Inception'} to ${dateEnd || 'Present'} | Generated on: ${new Date().toLocaleDateString()}
      </p>
      <hr style="border: 0; border-top: 1px solid #ccc; margin-top: 20px;">
    </div>

    <!-- Financial Health Summary Grid -->
    <div class="stats-grid" style="margin-bottom: 24px;">
      <div class="card stat-card" style="border-left: 4px solid var(--success);">
        <div class="stat-header">
          <span>TOTAL REVENUE</span>
          <span style="color: var(--success);">${ICON_TREND_UP}</span>
        </div>
        <div class="stat-value" style="color: var(--success);">₹${totalCollections.toLocaleString()}</div>
        <div class="stat-change tech-label">
          Cash: ₹${collectionsCash.toLocaleString()} | GPay: ₹${collectionsGPay.toLocaleString()}
        </div>
      </div>

      <div class="card stat-card" style="border-left: 4px solid var(--danger);">
        <div class="stat-header">
          <span>TOTAL EXPENSES</span>
          <span style="color: var(--danger);">${ICON_TREND_DOWN}</span>
        </div>
        <div class="stat-value" style="color: var(--danger);">₹${totalExpenses.toLocaleString()}</div>
        <div class="stat-change tech-label">
          ${Object.entries(expensesBreakdown).map(([cat, val]) => `${cat.replace('_', ' ')}: ₹${val}`).join(' | ') || 'No active expenses'}
        </div>
      </div>

      <div class="card stat-card" style="border-left: 4px solid var(--info);">
        <div class="stat-header">
          <span>NET BALANCES</span>
          <span style="color: var(--info);">${ICON_REPORTS}</span>
        </div>
        <div class="stat-value" style="color: ${netBalance >= 0 ? 'var(--success)' : 'var(--danger)'};">
          ₹${netBalance.toLocaleString()}
        </div>
        <div class="stat-change tech-label">
          Outstanding Cash Flow Net
        </div>
      </div>
    </div>

    <!-- 1. Player Financial Ledger Section -->
    <div class="card" style="margin-bottom: 24px;">
      <h3 class="card-title">1. Player Balance Ledger</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Matches</th>
              <th>Ball Dues</th>
              <th>Ball Paid</th>
              <th>Ball Bal</th>
              <th>Gen Dues</th>
              <th>Gen Paid</th>
              <th>Gen Bal</th>
              <th>Total Balance</th>
            </tr>
          </thead>
          <tbody>
            ${dashboard.playerBalances.length === 0 ? `
              <tr>
                <td colspan="9" style="text-align: center; color: var(--text-muted);">No player records found.</td>
              </tr>
            ` : dashboard.playerBalances.map(p => `
              <tr>
                <td><strong>${p.name}</strong><br><small class="tech-label" style="font-size: 0.7rem;">${p.phone}</small></td>
                <td style="font-family: var(--font-mono);">${p.matchesPlayed}</td>
                <td style="font-family: var(--font-mono);">₹${p.ballFeesDue}</td>
                <td style="font-family: var(--font-mono);">₹${p.ballFeesPaid}</td>
                <td style="font-family: var(--font-mono);"><span style="color: ${p.ballFeesBalance > 0 ? 'var(--warning)' : 'var(--text-muted)'};">₹${p.ballFeesBalance}</span></td>
                <td style="font-family: var(--font-mono);">₹${p.generalFeesDue}</td>
                <td style="font-family: var(--font-mono);">₹${p.generalPaid}</td>
                <td style="font-family: var(--font-mono);"><span style="color: ${p.generalBalance > 0 ? 'var(--warning)' : 'var(--text-muted)'};">₹${p.generalBalance}</span></td>
                <td style="font-family: var(--font-mono);">
                  <span class="badge ${p.totalBalance > 0 ? 'badge-danger' : 'badge-success'}">
                    ₹${p.totalBalance}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 2. Team Dues & Collections Section -->
    <div class="card" style="margin-bottom: 24px;">
      <h3 class="card-title">2. Squad & Team Summaries</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Team Name</th>
              <th>Active Players</th>
              <th>Total Collected from Squad</th>
              <th>Outstanding Dues</th>
            </tr>
          </thead>
          <tbody>
            ${dashboard.teams.length === 0 ? `
              <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted);">No teams registered.</td>
              </tr>
            ` : dashboard.teams.map(t => {
              // Calculate outstanding dues for this team from player balances
              const teamPlayers = dashboard.playerBalances.filter(p => p.team_id === t.teamId);
              const teamDues = teamPlayers.reduce((sum, p) => sum + p.totalBalance, 0);

              return `
                <tr>
                  <td><strong>${t.teamName}</strong></td>
                  <td>${t.playerCount} players</td>
                  <td style="font-family: var(--font-mono);"><strong style="color: var(--success);">₹${t.totalCollected.toLocaleString()}</strong></td>
                  <td>
                    <span class="badge ${teamDues > 0 ? 'badge-danger' : 'badge-success'}">
                      ₹${teamDues.toLocaleString()}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 3. Chronological Transactions Section -->
    <div class="card">
      <h3 class="card-title">3. Ledger Transaction Logs</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Name / Category</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Ref ID / Details</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted);">No transactions recorded.</td>
              </tr>
            ` : transactions.map(t => `
              <tr style="${t.isVoided ? 'opacity: 0.4; text-decoration: line-through;' : ''}">
                <td style="font-family: var(--font-mono);">${t.date}</td>
                <td>
                  <span class="badge ${t.type === 'Payment' ? 'badge-success' : 'badge-danger'}">
                    ${t.type}
                  </span>
                </td>
                <td><strong>${t.name}</strong></td>
                <td style="font-family: var(--font-mono);">
                  <strong style="color: ${t.isPositive ? 'var(--success)' : 'var(--danger)'};">
                    ${t.isPositive ? '+' : '-'}₹${t.amount.toLocaleString()}
                  </strong>
                </td>
                <td><span class="badge ${t.method === 'gpay' ? 'badge-success' : 'badge-warning'}">${t.method}</span></td>
                <td><small class="tech-label" style="font-size: 0.7rem;">${t.details}</small></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Inject Print CSS stylesheet overrides explicitly to handle print-only formatting perfectly -->
    <style>
      @media print {
        .print-only {
          display: block !important;
        }
        body {
          background: #fff !important;
          color: #000 !important;
        }
        .main-content {
          margin-left: 0 !important;
          padding: 0 !important;
        }
        .card {
          border: 1px solid #ccc !important;
          background: #fff !important;
          color: #000 !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          margin-bottom: 15px !important;
          padding: 15px !important;
        }
        table {
          color: #000 !important;
        }
        th {
          background: #f0f0f0 !important;
          color: #000 !important;
          border-bottom: 2px solid #ccc !important;
        }
        td {
          color: #000 !important;
          border-bottom: 1px solid #eee !important;
        }
        .badge {
          border: 1px solid #333 !important;
          color: #000 !important;
          background: transparent !important;
        }
      }
    </style>
  `;

  appEl.innerHTML = renderLayout(content, 'reports');
  bindLayoutEvents();

  // Bind reports-specific events
  bindReportsEvents(appEl, dashboard, players, teams, matches, payments, expenses, dateStart, dateEnd);
}

function bindReportsEvents(appEl, dashboard, players, teams, matches, payments, expenses, currentDateStart, currentDateEnd) {
  // Apply Filters
  const applyBtn = document.getElementById('apply-report-filters');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const start = document.getElementById('report-start-date').value;
      const end = document.getElementById('report-end-date').value;
      renderReportsDashboard(appEl, dashboard, players, teams, matches, payments, expenses, start, end);
    });
  }

  // Reset Filters
  const resetBtn = document.getElementById('reset-report-filters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      renderReportsDashboard(appEl, dashboard, players, teams, matches, payments, expenses, '', '');
    });
  }

  // Print button
  const printBtn = document.getElementById('print-report-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Export CSV Ledger
  const exportLedgerBtn = document.getElementById('export-csv-ledger');
  if (exportLedgerBtn) {
    exportLedgerBtn.addEventListener('click', () => {
      let csv = 'Player Name,Phone,Matches Played,Balls Played,Balls Bowled,General Due,General Paid,General Balance,Ball Fees Due,Ball Fees Paid,Ball Fees Balance,Total Balance\n';
      dashboard.playerBalances.forEach(p => {
        csv += `"${p.name}","${p.phone}",${p.matchesPlayed},${p.ballsPlayed},${p.ballsBowled},${p.generalFeesDue},${p.generalPaid},${p.generalBalance},${p.ballFeesDue},${p.ballFeesPaid},${p.ballFeesBalance},${p.totalBalance}\n`;
      });
      downloadCSV(csv, 'crickfin_player_ledger.csv');
    });
  }

  // Export CSV Transactions
  const exportTxsBtn = document.getElementById('export-csv-txs');
  if (exportTxsBtn) {
    exportTxsBtn.addEventListener('click', () => {
      let csv = 'Date,Type,Category/Player,Amount,Payment Method,Details/Ref ID\n';
      
      let filteredPayments = [...payments];
      let filteredExpenses = [...expenses];

      if (currentDateStart) {
        filteredPayments = filteredPayments.filter(p => p.payment_date >= currentDateStart);
        filteredExpenses = filteredExpenses.filter(e => e.expense_date >= currentDateStart);
      }
      if (currentDateEnd) {
        filteredPayments = filteredPayments.filter(p => p.payment_date <= currentDateEnd);
        filteredExpenses = filteredExpenses.filter(e => e.expense_date <= currentDateEnd);
      }

      const transactions = [];
      filteredPayments.forEach(p => {
        transactions.push({
          date: p.payment_date,
          type: 'Payment',
          name: p.player_name || 'Soft-deleted Player',
          amount: p.amount,
          method: p.payment_method,
          details: p.allocation === 'ball_fees' ? `Ball Fees - Ref: ${p.reference_id || 'N/A'}` : `General - Remarks: ${p.remarks || 'None'}`
        });
      });
      filteredExpenses.forEach(e => {
        if (e.status === 'active') {
          transactions.push({
            date: e.expense_date,
            type: 'Expense',
            name: `Expense: ${e.category} (${e.description})`,
            amount: e.amount,
            method: e.payment_method,
            details: e.status
          });
        }
      });

      transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      transactions.forEach(t => {
        csv += `"${t.date}","${t.type}","${t.name}",${t.amount},"${t.method}","${t.details}"\n`;
      });
      downloadCSV(csv, 'crickfin_transactions.csv');
    });
  }
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
