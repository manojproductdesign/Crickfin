import { store } from '../state.js';
import { renderLayout, bindLayoutEvents } from './layout.js';
import {
  ICON_SPINNER,
  ICON_EXPENSES,
  ICON_EDIT
} from '../assets/icons.js';

export async function renderExpenses() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  appEl.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
      <div style="text-align: center; color: var(--text-muted);">
        <div style="margin-bottom: 12px; display: flex; justify-content: center;">${ICON_SPINNER}</div>
        Loading expense logs...
      </div>
    </div>
  `;

  try {
    const expenses = await store.fetchExpenses();

    const content = `
      <div class="card">
        <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Purchase & Expenses Management</span>
          <button class="btn btn-primary btn-sm" id="log-expense-btn" style="display: flex; align-items: center; gap: 8px;">
            ${ICON_EXPENSES} <span>Log Expense</span>
          </button>
        </div>

        <!-- Filter Bar -->
        <div class="filter-bar">
          <select id="exp-category-filter" class="form-control" style="max-width: 200px;">
            <option value="">All Categories</option>
            <option value="kits">Kits</option>
            <option value="bats">Bats</option>
            <option value="medicines">Medicines</option>
            <option value="trophies">Trophies</option>
            <option value="ground_fees">Ground Fees</option>
            <option value="umpire_fees">Umpire Fees</option>
            <option value="others">Others</option>
          </select>
          <input type="date" id="exp-start-filter" class="form-control" />
          <input type="date" id="exp-end-filter" class="form-control" />
          <button class="btn btn-secondary btn-sm" id="filter-expenses-btn">Filter</button>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="expenses-table-body">
              ${renderExpenseRows(expenses)}
            </tbody>
          </table>
        </div>
      </div>

      <div id="expense-modal-container"></div>
    `;

    appEl.innerHTML = renderLayout(content, 'expenses');
    bindLayoutEvents();
    bindExpenseViewEvents();
  } catch (error) {
    appEl.innerHTML = renderLayout(`
      <div class="alert alert-danger">
        Failed to fetch expenses: ${error.message}
      </div>
    `, 'expenses');
    bindLayoutEvents();
  }
}

function renderExpenseRows(expenses) {
  if (expenses.length === 0) {
    return `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No expenses recorded.</td>
      </tr>
    `;
  }

  return expenses.map(e => `
    <tr style="${e.status === 'void' ? 'opacity: 0.5; text-decoration: line-through;' : ''}">
      <td><span class="badge ${getCategoryBadgeClass(e.category)}">${e.category.replace('_', ' ')}</span></td>
      <td><strong>${e.description}</strong></td>
      <td style="font-family: var(--font-mono);"><strong style="color: var(--danger);">₹${e.amount.toLocaleString()}</strong></td>
      <td style="font-family: var(--font-mono);">${e.expense_date}</td>
      <td><span class="badge ${e.payment_method === 'gpay' ? 'badge-success' : 'badge-warning'}">${e.payment_method}</span></td>
      <td>
        <span class="badge ${e.status === 'active' ? 'badge-success' : 'badge-danger'}">
          ${e.status}
        </span>
      </td>
      <td>
        <button class="btn btn-secondary btn-sm edit-expense-btn" style="display: inline-flex; align-items: center; gap: 4px;" data-id="${e.id}">${ICON_EDIT} <span>Edit / Void</span></button>
      </td>
    </tr>
  `).join('');
}

function getCategoryBadgeClass(category) {
  switch (category) {
    case 'ground_fees': return 'badge-info';
    case 'kits': return 'badge-success';
    case 'bats': return 'badge-success';
    case 'trophies': return 'badge-warning';
    case 'medicines': return 'badge-danger';
    default: return 'badge-info';
  }
}

function bindExpenseViewEvents() {
  const filterBtn = document.getElementById('filter-expenses-btn');
  if (filterBtn) {
    filterBtn.addEventListener('click', async () => {
      const category = document.getElementById('exp-category-filter').value;
      const dateStart = document.getElementById('exp-start-filter').value;
      const dateEnd = document.getElementById('exp-end-filter').value;

      try {
        const filtered = await store.fetchExpenses(category, dateStart, dateEnd);
        document.getElementById('expenses-table-body').innerHTML = renderExpenseRows(filtered);
        bindRowEditButtons();
      } catch (err) {
        alert('Failed to filter: ' + err.message);
      }
    });
  }

  const logBtn = document.getElementById('log-expense-btn');
  if (logBtn) {
    logBtn.addEventListener('click', showLogExpenseModal);
  }

  bindRowEditButtons();
}

function bindRowEditButtons() {
  document.querySelectorAll('.edit-expense-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const expense = store.getState().expenses.find(item => item.id === id);
      if (expense) {
        showEditExpenseModal(expense);
      }
    });
  });
}

function showLogExpenseModal() {
  const container = document.getElementById('expense-modal-container');
  if (!container) return;

  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Log League Expense</h3>
          <button class="close-btn" id="close-modal">&times;</button>
        </div>
        <form id="log-expense-form">
          <div class="modal-body">
            <div id="modal-alert"></div>
            <div class="form-group">
              <label for="e-category">Category</label>
              <select id="e-category" class="form-control" required>
                <option value="ground_fees" selected>Ground Fees</option>
                <option value="kits">Kits</option>
                <option value="bats">Bats</option>
                <option value="medicines">Medicines</option>
                <option value="trophies">Trophies</option>
                <option value="umpire_fees">Umpire Fees</option>
                <option value="others">Others</option>
              </select>
            </div>
            <div class="form-group">
              <label for="e-description">Description</label>
              <input type="text" id="e-description" class="form-control" placeholder="e.g. Ground Booking for Semi-Finals" required />
            </div>
            <div class="form-group">
              <label for="e-amount">Amount (₹)</label>
              <input type="number" id="e-amount" class="form-control" placeholder="e.g. 1500" required min="1" />
            </div>
            <div class="form-group">
              <label for="e-date">Date</label>
              <input type="date" id="e-date" class="form-control" value="${today}" required />
            </div>
            <div class="form-group">
              <label for="e-method">Payment Method</label>
              <select id="e-method" class="form-control" required>
                <option value="cash">Cash</option>
                <option value="gpay" selected>GPay (UPI)</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Log Expense</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => { container.innerHTML = ''; };
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-modal').addEventListener('click', closeModal);

  document.getElementById('log-expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = document.getElementById('e-category').value;
    const description = document.getElementById('e-description').value.trim();
    const amount = parseFloat(document.getElementById('e-amount').value);
    const expenseDate = document.getElementById('e-date').value;
    const paymentMethod = document.getElementById('e-method').value;

    try {
      await store.apiRequest('/expenses', 'POST', { category, description, amount, expenseDate, paymentMethod });
      closeModal();
      renderExpenses();
    } catch (err) {
      const alertBox = document.getElementById('modal-alert');
      if (alertBox) {
        alertBox.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
      }
    }
  });
}

function showEditExpenseModal(expense) {
  const container = document.getElementById('expense-modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Edit Expense</h3>
          <button class="close-btn" id="close-modal">&times;</button>
        </div>
        <form id="edit-expense-form">
          <div class="modal-body">
            <div id="modal-alert"></div>
            <div class="form-group">
              <label for="edit-e-category">Category</label>
              <select id="edit-e-category" class="form-control" required>
                <option value="ground_fees" ${expense.category === 'ground_fees' ? 'selected' : ''}>Ground Fees</option>
                <option value="kits" ${expense.category === 'kits' ? 'selected' : ''}>Kits</option>
                <option value="bats" ${expense.category === 'bats' ? 'selected' : ''}>Bats</option>
                <option value="medicines" ${expense.category === 'medicines' ? 'selected' : ''}>Medicines</option>
                <option value="trophies" ${expense.category === 'trophies' ? 'selected' : ''}>Trophies</option>
                <option value="umpire_fees" ${expense.category === 'umpire_fees' ? 'selected' : ''}>Umpire Fees</option>
                <option value="others" ${expense.category === 'others' ? 'selected' : ''}>Others</option>
              </select>
            </div>
            <div class="form-group">
              <label for="edit-e-description">Description</label>
              <input type="text" id="edit-e-description" class="form-control" value="${expense.description}" required />
            </div>
            <div class="form-group">
              <label for="edit-e-amount">Amount (₹)</label>
              <input type="number" id="edit-e-amount" class="form-control" value="${expense.amount}" required min="1" />
            </div>
            <div class="form-group">
              <label for="edit-e-date">Date</label>
              <input type="date" id="edit-e-date" class="form-control" value="${expense.expense_date}" required />
            </div>
            <div class="form-group">
              <label for="edit-e-method">Payment Method</label>
              <select id="edit-e-method" class="form-control" required>
                <option value="cash" ${expense.payment_method === 'cash' ? 'selected' : ''}>Cash</option>
                <option value="gpay" ${expense.payment_method === 'gpay' ? 'selected' : ''}>GPay (UPI)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="edit-e-status">Expense Status</label>
              <select id="edit-e-status" class="form-control" required>
                <option value="active" ${expense.status === 'active' ? 'selected' : ''}>Active (Include in financials)</option>
                <option value="void" ${expense.status === 'void' ? 'selected' : ''}>Void (Exclude from summaries)</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => { container.innerHTML = ''; };
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-modal').addEventListener('click', closeModal);

  document.getElementById('edit-expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = document.getElementById('edit-e-category').value;
    const description = document.getElementById('edit-e-description').value.trim();
    const amount = parseFloat(document.getElementById('edit-e-amount').value);
    const expenseDate = document.getElementById('edit-e-date').value;
    const paymentMethod = document.getElementById('edit-e-method').value;
    const status = document.getElementById('edit-e-status').value;

    try {
      await store.apiRequest(`/expenses/${expense.id}`, 'PUT', { category, description, amount, expenseDate, paymentMethod, status });
      closeModal();
      renderExpenses();
    } catch (err) {
      const alertBox = document.getElementById('modal-alert');
      if (alertBox) {
        alertBox.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
      }
    }
  });
}
