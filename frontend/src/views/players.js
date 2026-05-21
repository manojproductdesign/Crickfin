import { store } from '../state.js';
import { renderLayout, bindLayoutEvents } from './layout.js';
import {
  ICON_SPINNER,
  ICON_PLUS,
  ICON_EDIT,
  ICON_DELETE
} from '../assets/icons.js';

export async function renderPlayers() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  appEl.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
      <div style="text-align: center; color: var(--text-muted);">
        <div style="margin-bottom: 12px; display: flex; justify-content: center;">${ICON_SPINNER}</div>
        Loading player roster...
      </div>
    </div>
  `;

  try {
    const players = await store.fetchPlayers();
    const teams = await store.fetchTeams();

    const content = `
      <div class="card">
        <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Player Management</span>
          <button class="btn btn-primary btn-sm" id="add-player-btn" style="display: flex; align-items: center; gap: 8px;">
            ${ICON_PLUS} <span>Add Player</span>
          </button>
        </div>

        <!-- Search and Filter Bar -->
        <div class="filter-bar">
          <input type="text" id="player-search" class="form-control" placeholder="Search by name, email, phone..." style="flex-grow: 1; max-width: 300px;" />
          <select id="player-team-filter" class="form-control" style="max-width: 200px;">
            <option value="">All Teams</option>
            <option value="unassigned">Unassigned</option>
            ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
          <button class="btn btn-secondary btn-sm" id="filter-btn">Filter</button>
        </div>

        <!-- Players List Table -->
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Team</th>
                <th>Status</th>
                <th>Registered Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="players-table-body">
              ${renderPlayerRows(players)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modals Container -->
      <div id="player-modal-container"></div>
    `;

    appEl.innerHTML = renderLayout(content, 'players');
    bindLayoutEvents();
    bindPlayerEvents(teams);
  } catch (error) {
    appEl.innerHTML = renderLayout(`
      <div class="alert alert-danger">
        Failed to fetch players: ${error.message}
      </div>
    `, 'players');
    bindLayoutEvents();
  }
}

function renderPlayerRows(players) {
  if (players.length === 0) {
    return `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No players found.</td>
      </tr>
    `;
  }

  return players.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.email}</td>
      <td style="font-family: var(--font-mono);">${p.phone}</td>
      <td>${p.team_name ? `<span class="badge badge-info">${p.team_name}</span>` : '<span style="color: var(--text-muted-darker); font-style: italic;">Unassigned</span>'}</td>
      <td>
        <span class="badge ${p.status === 'approved' ? 'badge-success' : 'badge-warning'}">
          ${p.status}
        </span>
      </td>
      <td style="font-family: var(--font-mono);">${new Date(p.created_at).toLocaleDateString()}</td>
      <td>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm edit-player-btn" data-id="${p.id}" style="display: flex; align-items: center; gap: 4px;">
            ${ICON_EDIT} <span>Edit</span>
          </button>
          <button class="btn btn-danger btn-sm delete-player-btn" data-id="${p.id}" data-name="${p.name}" style="display: flex; align-items: center; gap: 4px;">
            ${ICON_DELETE} <span>Delete</span>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function bindPlayerEvents(teams) {
  const searchInput = document.getElementById('player-search');
  const teamFilter = document.getElementById('player-team-filter');
  const filterBtn = document.getElementById('filter-btn');

  const executeFilter = async () => {
    const search = searchInput.value.trim();
    let teamId = teamFilter.value;
    if (teamId === 'unassigned') teamId = 'null'; // We'll handle this in fetch or manually filter
    
    try {
      let filtered = await store.fetchPlayers(search, teamId === 'null' ? '' : teamId);
      if (teamId === 'null') {
        filtered = filtered.filter(p => !p.team_id);
      }
      document.getElementById('players-table-body').innerHTML = renderPlayerRows(filtered);
      bindRowActionButtons(teams);
    } catch (err) {
      alert('Failed to filter: ' + err.message);
    }
  };

  if (filterBtn) {
    filterBtn.addEventListener('click', executeFilter);
  }

  // Handle enter key on search
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        executeFilter();
      }
    });
  }

  // Add Player Modal
  const addPlayerBtn = document.getElementById('add-player-btn');
  if (addPlayerBtn) {
    addPlayerBtn.addEventListener('click', () => {
      showAddPlayerModal(teams);
    });
  }

  bindRowActionButtons(teams);
}

function bindRowActionButtons(teams) {
  // Edit Buttons
  document.querySelectorAll('.edit-player-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const player = store.getState().players.find(p => p.id === id);
      if (player) {
        showEditPlayerModal(player, teams);
      }
    });
  });

  // Delete Buttons
  document.querySelectorAll('.delete-player-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');
      showDeleteConfirmation(id, name);
    });
  });
}

function showAddPlayerModal(teams) {
  const container = document.getElementById('player-modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Add New Player</h3>
          <button class="close-btn" id="close-modal">&times;</button>
        </div>
        <form id="add-player-form">
          <div class="modal-body">
            <div id="modal-alert"></div>
            <div class="form-group">
              <label for="add-p-name">Full Name</label>
              <input type="text" id="add-p-name" class="form-control" placeholder="John Doe" required />
            </div>
            <div class="form-group">
              <label for="add-p-email">Email Address</label>
              <input type="email" id="add-p-email" class="form-control" placeholder="john@example.com" required />
            </div>
            <div class="form-group">
              <label for="add-p-phone">Phone Number</label>
              <input type="tel" id="add-p-phone" class="form-control" placeholder="9999999999" style="font-family: var(--font-mono);" required />
            </div>
            <div class="form-group">
              <label for="add-p-password">Password</label>
              <input type="password" id="add-p-password" class="form-control" placeholder="••••••••" required minlength="6" />
            </div>
            <div class="form-group">
              <label for="add-p-team">Assign Team (Optional)</label>
              <select id="add-p-team" class="form-control">
                <option value="">No Team</option>
                ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Player</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => { container.innerHTML = ''; };
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-modal').addEventListener('click', closeModal);

  document.getElementById('add-player-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('add-p-name').value.trim();
    const email = document.getElementById('add-p-email').value.trim();
    const phone = document.getElementById('add-p-phone').value.trim();
    const password = document.getElementById('add-p-password').value;
    const teamId = document.getElementById('add-p-team').value;

    try {
      await store.apiRequest('/players', 'POST', { name, email, phone, password, teamId });
      closeModal();
      renderPlayers(); // Refresh list
    } catch (err) {
      const alertBox = document.getElementById('modal-alert');
      if (alertBox) {
        alertBox.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
      }
    }
  });
}

function showEditPlayerModal(player, teams) {
  const container = document.getElementById('player-modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Edit Player Details</h3>
          <button class="close-btn" id="close-modal">&times;</button>
        </div>
        <form id="edit-player-form">
          <div class="modal-body">
            <div id="modal-alert"></div>
            <div class="form-group">
              <label for="edit-p-name">Full Name</label>
              <input type="text" id="edit-p-name" class="form-control" value="${player.name}" required />
            </div>
            <div class="form-group">
              <label for="edit-p-email">Email Address</label>
              <input type="email" id="edit-p-email" class="form-control" value="${player.email}" required />
            </div>
            <div class="form-group">
              <label for="edit-p-phone">Phone Number</label>
              <input type="tel" id="edit-p-phone" class="form-control" value="${player.phone}" style="font-family: var(--font-mono);" required />
            </div>
            <div class="form-group">
              <label for="edit-p-team">Team</label>
              <select id="edit-p-team" class="form-control">
                <option value="">No Team</option>
                ${teams.map(t => `<option value="${t.id}" ${player.team_id === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="edit-p-status">Status</label>
              <select id="edit-p-status" class="form-control" required>
                <option value="approved" ${player.status === 'approved' ? 'selected' : ''}>Approved</option>
                <option value="pending" ${player.status === 'pending' ? 'selected' : ''}>Pending</option>
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

  document.getElementById('edit-player-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('edit-p-name').value.trim();
    const email = document.getElementById('edit-p-email').value.trim();
    const phone = document.getElementById('edit-p-phone').value.trim();
    const teamId = document.getElementById('edit-p-team').value;
    const status = document.getElementById('edit-p-status').value;

    try {
      await store.apiRequest(`/players/${player.id}`, 'PUT', { name, email, phone, teamId, status });
      closeModal();
      renderPlayers(); // Refresh list
    } catch (err) {
      const alertBox = document.getElementById('modal-alert');
      if (alertBox) {
        alertBox.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
      }
    }
  });
}

function showDeleteConfirmation(id, name) {
  const container = document.getElementById('player-modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="modal-title" style="color: var(--danger);">Confirm Soft Delete</h3>
          <button class="close-btn" id="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete player <strong>${name}</strong>?</p>
          <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 8px;">
            Note: This player will be soft-deleted. Their registration record will be hidden from active lists but historical billing and match data will remain intact for audit reports.
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
          <button type="button" class="btn btn-danger" id="confirm-delete-btn">Yes, Soft Delete</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => { container.innerHTML = ''; };
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-modal').addEventListener('click', closeModal);

  document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    try {
      await store.apiRequest(`/players/${id}`, 'DELETE');
      closeModal();
      renderPlayers(); // Refresh list
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  });
}
