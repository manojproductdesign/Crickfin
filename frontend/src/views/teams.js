import { store } from '../state.js';
import { renderLayout, bindLayoutEvents } from './layout.js';
import { ICON_SPINNER, ICON_EDIT, ICON_DELETE } from '../assets/icons.js';

export async function renderTeams() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  appEl.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
      <div style="text-align: center; color: var(--text-muted);">
        <div style="margin-bottom: 12px; display: flex; justify-content: center;">${ICON_SPINNER}</div>
        Loading team structures...
      </div>
    </div>
  `;

  try {
    const teams = await store.fetchTeams();
    const players = await store.fetchPlayers();
    
    // We can also fetch the dashboard summary to display team-wise financial collections!
    const dashboardData = await store.apiRequest('/dashboard/summary');
    const teamFinMap = {};
    dashboardData.teams.forEach(t => {
      teamFinMap[t.teamId] = {
        playerCount: t.playerCount,
        totalCollected: t.totalCollected
      };
    });

    const content = `
      <div class="grid-2">
        <!-- Create Team Card -->
        <div class="card" style="height: fit-content;">
          <h3 class="card-title">Create New Team</h3>
          <div id="team-alert" role="alert" aria-live="assertive"></div>
          <form id="create-team-form">
            <div class="form-group">
              <label for="new-team-name">Team Name</label>
              <input type="text" id="new-team-name" class="form-control" placeholder="e.g. Royal Strikers" required />
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Create Team</button>
          </form>
        </div>

        <!-- Assign Players Card -->
        <div class="card" style="height: fit-content;">
          <h3 class="card-title">Assign Player to Team</h3>
          <div id="assign-alert" role="alert" aria-live="assertive"></div>
          <form id="assign-player-form">
            <div class="form-group">
              <label for="assign-player">Select Player</label>
              <select id="assign-player" class="form-control" required>
                <option value="">-- Select Player --</option>
                ${players.map(p => `<option value="${p.id}">${p.name} (${p.team_name || 'No Team'})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="assign-team">Select Team</label>
              <select id="assign-team" class="form-control" required>
                <option value="">-- Remove from Team --</option>
                ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
              </select>
            </div>
            <button type="submit" class="btn btn-secondary" style="width: 100%;">Update Assignment</button>
          </form>
        </div>
      </div>

      <!-- Teams Grid -->
      <div class="card" style="margin-top: 24px;">
        <h3 class="card-title">Teams List</h3>
        <div class="grid-2" style="margin-top: 16px; gap: 16px;">
          ${teams.length === 0 ? `
            <p style="color: var(--text-muted); grid-column: span 2; text-align: center; padding: 20px;">No teams created yet.</p>
          ` : teams.map(t => {
              const fin = teamFinMap[t.id] || { playerCount: 0, totalCollected: 0 };
              const teamPlayers = players.filter(p => p.team_id === t.id);

              return `
                <div class="card" style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); padding: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 12px;">
                    <h4 style="font-size: 1.15rem; color: var(--accent-color); margin-right: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.name}</h4>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <button class="btn btn-secondary btn-sm edit-team-btn" data-id="${t.id}" data-name="${t.name}" style="padding: 4px 8px; min-height: unset; height: 28px;" title="Rename Team" aria-label="Rename team ${t.name}">
                        ${ICON_EDIT}
                      </button>
                      <button class="btn btn-danger btn-sm delete-team-btn" data-id="${t.id}" data-name="${t.name}" style="padding: 4px 8px; min-height: unset; height: 28px;" title="Delete Team" aria-label="Delete team ${t.name}">
                        ${ICON_DELETE}
                      </button>
                      <span class="badge badge-info">${fin.playerCount} Players</span>
                    </div>
                  </div>
                  
                  <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px; display: flex; justify-content: space-between;">
                    <span>Collected Fees:</span>
                    <strong style="color: var(--success); font-family: var(--font-mono);">₹${fin.totalCollected.toLocaleString()}</strong>
                  </div>

                  <h5 class="tech-label" style="font-size: 0.75rem; margin-bottom: 6px;">Squad</h5>
                  <ul style="list-style: none; padding-left: 0; font-size: 0.85rem; max-height: 120px; overflow-y: auto;">
                    ${teamPlayers.length === 0 ? `
                      <li style="color: var(--text-muted-darker); font-style: italic;">No players assigned</li>
                    ` : teamPlayers.map(tp => `
                      <li style="padding: 4px 0; border-bottom: 1px dashed rgba(255,255,255,0.04); display: flex; justify-content: space-between;">
                        <span>${tp.name}</span>
                        <span style="font-family: var(--font-mono); color: var(--text-muted-darker); font-size: 0.75rem;">${tp.phone}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              `;
            }).join('')}
        </div>
      </div>

      <!-- Modals Container -->
      <div id="team-modal-container"></div>
    `;

    appEl.innerHTML = renderLayout(content, 'teams');
    bindLayoutEvents();
    bindTeamViewEvents();
  } catch (error) {
    appEl.innerHTML = renderLayout(`
      <div class="alert alert-danger">
        Failed to fetch teams: ${error.message}
      </div>
    `, 'teams');
    bindLayoutEvents();
  }
}

function bindTeamViewEvents() {
  // Create Team Form Submit
  const createForm = document.getElementById('create-team-form');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-team-name').value.trim();

      try {
        await store.apiRequest('/teams', 'POST', { name });
        renderTeams(); // Refresh view
      } catch (err) {
        const alertBox = document.getElementById('team-alert');
        if (alertBox) {
          alertBox.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
        }
      }
    });
  }

  // Assign Player Form Submit
  const assignForm = document.getElementById('assign-player-form');
  if (assignForm) {
    assignForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const playerId = document.getElementById('assign-player').value;
      const teamId = document.getElementById('assign-team').value;

      try {
        await store.apiRequest('/teams/assign', 'POST', { playerId, teamId: teamId || null });
        renderTeams(); // Refresh view
      } catch (err) {
        const alertBox = document.getElementById('assign-alert');
        if (alertBox) {
          alertBox.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
        }
      }
    });
  }

  // Bind Edit & Delete buttons
  document.querySelectorAll('.edit-team-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');
      showEditTeamModal(id, name);
    });
  });

  document.querySelectorAll('.delete-team-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');
      showDeleteTeamModal(id, name);
    });
  });
}

function showEditTeamModal(id, name) {
  const container = document.getElementById('team-modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="modal-title">Rename Team</h3>
          <button class="close-btn" id="close-modal">&times;</button>
        </div>
        <form id="edit-team-form">
          <div class="modal-body">
            <div id="modal-alert"></div>
            <div class="form-group">
              <label for="edit-team-name-input">Team Name</label>
              <input type="text" id="edit-team-name-input" class="form-control" value="${name}" required />
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

  // Focus trap and Escape close
  const modalElement = container.querySelector('.modal-content');
  if (modalElement) {
    const focusableEls = modalElement.querySelectorAll('input, button');
    const firstFocusable = focusableEls[0];
    const lastFocusable = focusableEls[focusableEls.length - 1];
    if (firstFocusable) setTimeout(() => firstFocusable.focus(), 50);

    container.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
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
      } else if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  document.getElementById('edit-team-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('edit-team-name-input').value.trim();

    try {
      await store.apiRequest(`/teams/${id}`, 'PUT', { name: newName });
      closeModal();
      renderTeams(); // Refresh view
    } catch (err) {
      const alertBox = document.getElementById('modal-alert');
      if (alertBox) {
        alertBox.innerHTML = `<div class="alert alert-danger" role="alert" aria-live="assertive">${err.message}</div>`;
      }
    }
  });
}

function showDeleteTeamModal(id, name) {
  const container = document.getElementById('team-modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="modal-title" style="color: var(--danger);">Confirm Delete Team</h3>
          <button class="close-btn" id="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete team <strong>${name}</strong>?</p>
          <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 8px;">
            Note: All players assigned to this team will be reset to unassigned. Historical match data and financial billing records will remain intact.
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
          <button type="button" class="btn btn-danger" id="confirm-delete-btn">Yes, Delete Team</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => { container.innerHTML = ''; };
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-modal').addEventListener('click', closeModal);

  // Focus trap and Escape close
  const modalElement = container.querySelector('.modal-content');
  if (modalElement) {
    const focusableEls = modalElement.querySelectorAll('button');
    const firstFocusable = focusableEls[0];
    const lastFocusable = focusableEls[focusableEls.length - 1];
    if (firstFocusable) setTimeout(() => firstFocusable.focus(), 50);

    container.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
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
      } else if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    try {
      await store.apiRequest(`/teams/${id}`, 'DELETE');
      closeModal();
      renderTeams(); // Refresh view
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  });
}
