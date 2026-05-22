import { store } from '../state.js';
import { renderLayout, bindLayoutEvents } from './layout.js';
import { ICON_SPINNER } from '../assets/icons.js';

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
                    <h4 style="font-size: 1.15rem; color: var(--accent-color);">${t.name}</h4>
                    <span class="badge badge-info">${fin.playerCount} Players</span>
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
}
