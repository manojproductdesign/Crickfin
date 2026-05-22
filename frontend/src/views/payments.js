import { store } from '../state.js';
import { renderLayout, bindLayoutEvents } from './layout.js';
import {
  ICON_SPINNER,
  ICON_PAYMENTS
} from '../assets/icons.js';

export async function renderPayments() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  appEl.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
      <div style="text-align: center; color: var(--text-muted);">
        <div style="margin-bottom: 12px; display: flex; justify-content: center;">${ICON_SPINNER}</div>
        Loading transaction ledgers...
      </div>
    </div>
  `;

  try {
    const payments = await store.apiRequest('/payments');
    const players = await store.fetchPlayers();

    const content = `
      <div class="card">
        <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Fee Collections</span>
          <button class="btn btn-primary btn-sm" id="record-payment-btn" style="display: flex; align-items: center; gap: 8px;">
            ${ICON_PAYMENTS} <span>Record Payment</span>
          </button>
        </div>

        <!-- Search / Filter Bar -->
        <div class="filter-bar">
          <select id="pay-player-filter" class="form-control" style="max-width: 200px;" aria-label="Filter payments by Player">
            <option value="">All Players</option>
            ${players.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
          <select id="pay-method-filter" class="form-control" style="max-width: 150px;" aria-label="Filter payments by Payment Method">
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="gpay">GPay</option>
          </select>
          <input type="date" id="pay-start-filter" class="form-control" placeholder="Start Date" aria-label="Payment Start Date" />
          <input type="date" id="pay-end-filter" class="form-control" placeholder="End Date" aria-label="Payment End Date" />
          <button class="btn btn-secondary btn-sm" id="filter-payments-btn">Filter</button>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Player Name</th>
                <th>Amount</th>
                <th>Payment Date</th>
                <th>Method</th>
                <th>Reference ID</th>
                <th>Allocation</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody id="payments-table-body">
              ${renderPaymentRows(payments)}
            </tbody>
          </table>
        </div>
      </div>

      <div id="payment-modal-container"></div>
    `;

    appEl.innerHTML = renderLayout(content, 'payments');
    bindLayoutEvents();
    bindPaymentViewEvents(players);
  } catch (error) {
    appEl.innerHTML = renderLayout(`
      <div class="alert alert-danger">
        Failed to fetch payments: ${error.message}
      </div>
    `, 'payments');
    bindLayoutEvents();
  }
}

function renderPaymentRows(payments) {
  if (payments.length === 0) {
    return `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No payments found matching criteria.</td>
      </tr>
    `;
  }

  return payments.map(p => `
    <tr>
      <td><strong>${p.player_name}</strong><br><small class="tech-label" style="font-size: 0.7rem;">${p.team_name || ''}</small></td>
      <td style="font-family: var(--font-mono);"><strong style="color: var(--success);">₹${p.amount.toLocaleString()}</strong></td>
      <td style="font-family: var(--font-mono);">${p.payment_date}</td>
      <td><span class="badge ${p.payment_method === 'gpay' ? 'badge-success' : 'badge-warning'}">${p.payment_method}</span></td>
      <td><small class="tech-label" style="font-size: 0.7rem;">${p.reference_id || 'N/A'}</small></td>
      <td><span style="text-transform: capitalize; font-size: 0.8rem;">${p.allocation.replace('_', ' ')}</span></td>
      <td style="color: var(--text-muted); font-size: 0.85rem;">${p.remarks || '-'}</td>
    </tr>
  `).join('');
}

function bindPaymentViewEvents(players) {
  const filterBtn = document.getElementById('filter-payments-btn');
  if (filterBtn) {
    filterBtn.addEventListener('click', async () => {
      const playerId = document.getElementById('pay-player-filter').value;
      const method = document.getElementById('pay-method-filter').value;
      const dateStart = document.getElementById('pay-start-filter').value;
      const dateEnd = document.getElementById('pay-end-filter').value;

      let queryParams = [];
      if (playerId) queryParams.push(`playerId=${playerId}`);
      if (method) queryParams.push(`method=${method}`);
      if (dateStart) queryParams.push(`dateStart=${dateStart}`);
      if (dateEnd) queryParams.push(`dateEnd=${dateEnd}`);

      const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';
      try {
        const filtered = await store.apiRequest(`/payments${queryString}`);
        document.getElementById('payments-table-body').innerHTML = renderPaymentRows(filtered);
      } catch (err) {
        alert('Failed to filter: ' + err.message);
      }
    });
  }

  const recordBtn = document.getElementById('record-payment-btn');
  if (recordBtn) {
    recordBtn.addEventListener('click', () => {
      showRecordPaymentModal(players);
    });
  }
}

function showRecordPaymentModal(players) {
  const container = document.getElementById('payment-modal-container');
  if (!container) return;

  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Record Player Payment</h3>
          <button class="close-btn" id="close-modal">&times;</button>
        </div>
        <form id="record-payment-form">
          <div class="modal-body">
            <div id="modal-alert"></div>
            <div class="form-group">
              <label for="p-player">Select Player</label>
              <select id="p-player" class="form-control" required>
                <option value="">-- Select Player --</option>
                ${players.map(p => `<option value="${p.id}">${p.name} (${p.phone})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="p-amount">Payment Amount (₹)</label>
              <input type="number" id="p-amount" class="form-control" placeholder="e.g. 500" required min="1" />
            </div>
            <div class="form-group">
              <label for="p-date">Payment Date</label>
              <input type="date" id="p-date" class="form-control" value="${today}" required />
            </div>
            <div class="form-group">
              <label for="p-method">Payment Method</label>
              <select id="p-method" class="form-control" required>
                <option value="cash">Cash</option>
                <option value="gpay">GPay (UPI)</option>
              </select>
            </div>
            <div class="form-group" id="ref-group" style="display: none;">
              <label for="p-ref">GPay Transaction ID / Reference ID</label>
              <input type="text" id="p-ref" class="form-control" placeholder="e.g. UPI123456789" />
            </div>
            <div class="form-group">
              <label for="p-allocation">Allocate Towards</label>
              <select id="p-allocation" class="form-control" required>
                <option value="general" selected>General League Fees</option>
                <option value="ball_fees">Ball Fees Balance</option>
              </select>
            </div>
            <div class="form-group">
              <label for="p-remarks">Remarks (Optional)</label>
              <input type="text" id="p-remarks" class="form-control" placeholder="e.g. Paid for match vs Blue Rockets" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Record Payment</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => { container.innerHTML = ''; };
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-modal').addEventListener('click', closeModal);

  // Focus trap and Escape close
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      const focusableEls = container.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])');
      const visibleFocusable = Array.from(focusableEls).filter(el => {
        const style = window.getComputedStyle(el);
        const parentStyle = window.getComputedStyle(el.parentElement);
        return style.display !== 'none' && style.visibility !== 'hidden' && parentStyle.visibility !== 'hidden';
      });
      if (visibleFocusable.length > 0) {
        const firstFocusable = visibleFocusable[0];
        const lastFocusable = visibleFocusable[visibleFocusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
          }
        }
      }
    } else if (e.key === 'Escape') {
      closeModal();
    }
  });
  // Auto-focus first input
  const firstInput = container.querySelector('input, select');
  if (firstInput) setTimeout(() => firstInput.focus(), 50);

  const methodSelect = document.getElementById('p-method');
  const refGroup = document.getElementById('ref-group');
  const refInput = document.getElementById('p-ref');

  methodSelect.addEventListener('change', () => {
    if (methodSelect.value === 'gpay') {
      refGroup.style.display = 'flex';
      refInput.setAttribute('required', 'true');
    } else {
      refGroup.style.display = 'none';
      refInput.removeAttribute('required');
      refInput.value = '';
    }
  });

  document.getElementById('record-payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const playerId = document.getElementById('p-player').value;
    const amount = parseFloat(document.getElementById('p-amount').value);
    const paymentDate = document.getElementById('p-date').value;
    const paymentMethod = document.getElementById('p-method').value;
    const referenceId = document.getElementById('p-ref').value.trim();
    const allocation = document.getElementById('p-allocation').value;
    const remarks = document.getElementById('p-remarks').value.trim();

    try {
      await store.apiRequest('/payments', 'POST', {
        playerId,
        amount,
        paymentDate,
        paymentMethod,
        referenceId,
        allocation,
        remarks
      });
      closeModal();
      renderPayments(); // Refresh list
    } catch (err) {
      const alertBox = document.getElementById('modal-alert');
      if (alertBox) {
        alertBox.innerHTML = `<div class="alert alert-danger" role="alert" aria-live="assertive">${err.message}</div>`;
      }
    }
  });
}
