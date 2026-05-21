import { store } from '../state.js';
import { renderLayout, bindLayoutEvents } from './layout.js';
import {
  ICON_SPINNER,
  ICON_PLUS,
  ICON_PLAYERS,
  ICON_CHECK
} from '../assets/icons.js';

export async function renderMatches() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  appEl.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
      <div style="text-align: center; color: var(--text-muted);">
        <div style="margin-bottom: 12px; display: flex; justify-content: center;">${ICON_SPINNER}</div>
        Loading matches schedule...
      </div>
    </div>
  `;

  try {
    const matches = await store.fetchMatches();

    const content = `
      <div class="card">
        <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Match Schedule</span>
          <button class="btn btn-primary btn-sm" id="schedule-match-btn" style="display: flex; align-items: center; gap: 8px;">
            ${ICON_PLUS} <span>Schedule Match</span>
          </button>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Opponent</th>
                <th>Venue</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="matches-table-body">
              ${matches.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No matches scheduled.</td>
                </tr>
              ` : matches.map(m => `
                <tr>
                  <td><strong style="font-family: var(--font-mono);">${m.match_date}</strong></td>
                  <td>${m.opponent_team}</td>
                  <td><span style="color: var(--text-muted);">${m.venue}</span></td>
                  <td><span class="badge badge-info">${m.match_type}</span></td>
                  <td>
                    <span class="badge ${m.status === 'completed' ? 'badge-success' : 'badge-warning'}">
                      ${m.status}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 8px;">
                      <button class="btn btn-secondary btn-sm manage-participation-btn" data-id="${m.id}" data-opponent="${m.opponent_team}" style="display: flex; align-items: center; gap: 4px;">
                        ${ICON_PLAYERS} <span>Participation</span>
                      </button>
                      ${m.status === 'scheduled' ? `
                        <button class="btn btn-primary btn-sm complete-match-btn" data-id="${m.id}" style="display: flex; align-items: center; gap: 4px;">
                          ${ICON_CHECK} <span>Complete</span>
                        </button>
                      ` : `
                        <button class="btn btn-secondary btn-sm complete-match-btn" data-id="${m.id}" style="opacity: 0.6;">Edit Stats</button>
                      `}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div id="match-modal-container"></div>
    `;

    appEl.innerHTML = renderLayout(content, 'matches');
    bindLayoutEvents();
    bindMatchEvents();
  } catch (error) {
    appEl.innerHTML = renderLayout(`
      <div class="alert alert-danger">
        Failed to fetch matches: ${error.message}
      </div>
    `, 'matches');
    bindLayoutEvents();
  }
}

function bindMatchEvents() {
  const scheduleMatchBtn = document.getElementById('schedule-match-btn');
  if (scheduleMatchBtn) {
    scheduleMatchBtn.addEventListener('click', showScheduleMatchModal);
  }

  // Manage Participation
  document.querySelectorAll('.manage-participation-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const matchId = e.currentTarget.getAttribute('data-id');
      const opponent = e.currentTarget.getAttribute('data-opponent');
      showParticipationModal(matchId, opponent);
    });
  });

  // Complete Match / Edit Stats
  document.querySelectorAll('.complete-match-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const matchId = e.currentTarget.getAttribute('data-id');
      showCompleteMatchModal(matchId);
    });
  });
}

function showScheduleMatchModal() {
  const container = document.getElementById('match-modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Schedule New Match</h3>
          <button class="close-btn" id="close-modal">&times;</button>
        </div>
        <form id="schedule-match-form">
          <div class="modal-body">
            <div id="modal-alert"></div>
            <div class="form-group">
              <label for="m-date">Match Date</label>
              <input type="date" id="m-date" class="form-control" required />
            </div>
            <div class="form-group">
              <label for="m-opponent">Opponent Team</label>
              <input type="text" id="m-opponent" class="form-control" placeholder="e.g. Blue Rockets CC" required />
            </div>
            <div class="form-group">
              <label for="m-venue">Venue / Ground</label>
              <input type="text" id="m-venue" class="form-control" placeholder="e.g. Eden Gardens, Kolkata" required />
            </div>
            <div class="form-group">
              <label for="m-type">Match Type</label>
              <select id="m-type" class="form-control" required>
                <option value="league" selected>League Match</option>
                <option value="knockout">Knockout Match</option>
                <option value="friendly">Friendly Match</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Schedule</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => { container.innerHTML = ''; };
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-modal').addEventListener('click', closeModal);

  document.getElementById('schedule-match-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const matchDate = document.getElementById('m-date').value;
    const opponentTeam = document.getElementById('m-opponent').value.trim();
    const venue = document.getElementById('m-venue').value.trim();
    const matchType = document.getElementById('m-type').value;

    try {
      await store.apiRequest('/matches', 'POST', { matchDate, opponentTeam, venue, matchType });
      closeModal();
      renderMatches(); // Refresh
    } catch (err) {
      const alertBox = document.getElementById('modal-alert');
      if (alertBox) {
        alertBox.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
      }
    }
  });
}

async function showParticipationModal(matchId, opponent) {
  const container = document.getElementById('match-modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="modal-title">Squad Participation - vs ${opponent}</h3>
          <button class="close-btn" id="close-modal">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
          <div id="modal-alert"></div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
            Mark which players participated and log their played/bowled ball statistics below.
          </p>
          <form id="participation-form">
            <div id="participation-list-container">
              Loading active players...
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="save-participation-btn">Save Squad</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => { container.innerHTML = ''; };
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-modal').addEventListener('click', closeModal);

  try {
    const players = await store.fetchPlayers();
    const activeParticipation = await store.apiRequest(`/matches/${matchId}/participation`);
    const partMap = {};
    activeParticipation.forEach(ap => {
      partMap[ap.player_id] = {
        ballsPlayed: ap.balls_played,
        ballsBowled: ap.balls_bowled
      };
    });

    const listContainer = document.getElementById('participation-list-container');
    listContainer.innerHTML = players.map(p => {
      const isChecked = !!partMap[p.id];
      const stats = partMap[p.id] || { ballsPlayed: 0, ballsBowled: 0 };
      
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: rgba(255,255,255,0.015); border-bottom: 1px solid var(--border-color); transition: background 0.15s ease;">
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex-grow: 1;">
            <input type="checkbox" class="player-checkbox" data-id="${p.id}" ${isChecked ? 'checked' : ''} />
            <span><strong>${p.name}</strong> <small style="color: var(--text-muted); font-size: 0.75rem;">${p.team_name || ''}</small></span>
          </label>
          <div class="stats-inputs" style="display: flex; gap: 8px; visibility: ${isChecked ? 'visible' : 'hidden'};">
            <input type="number" class="form-control p-balls-played" placeholder="Played" title="Balls Played" value="${stats.ballsPlayed}" style="width: 80px; padding: 4px 8px; font-size: 0.8rem; font-family: var(--font-mono);" min="0" />
            <input type="number" class="form-control p-balls-bowled" placeholder="Bowled" title="Balls Bowled" value="${stats.ballsBowled}" style="width: 80px; padding: 4px 8px; font-size: 0.8rem; font-family: var(--font-mono);" min="0" />
          </div>
        </div>
      `;
    }).join('');

    // Toggle input visibility on check
    listContainer.querySelectorAll('.player-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const row = e.target.closest('div');
        const inputs = row.querySelector('.stats-inputs');
        if (e.target.checked) {
          inputs.style.visibility = 'visible';
        } else {
          inputs.style.visibility = 'hidden';
        }
      });
    });

    document.getElementById('save-participation-btn').addEventListener('click', async (e) => {
      e.preventDefault();
      const participations = [];
      
      listContainer.querySelectorAll('.player-checkbox').forEach(cb => {
        if (cb.checked) {
          const playerId = cb.getAttribute('data-id');
          const row = cb.closest('div');
          const ballsPlayed = parseInt(row.querySelector('.p-balls-played').value) || 0;
          const ballsBowled = parseInt(row.querySelector('.p-balls-bowled').value) || 0;
          participations.push({ playerId, ballsPlayed, ballsBowled });
        }
      });

      try {
        await store.apiRequest(`/matches/${matchId}/participation`, 'POST', { participations });
        closeModal();
        renderMatches();
      } catch (err) {
        const alertBox = document.getElementById('modal-alert');
        if (alertBox) {
          alertBox.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
        }
      }
    });

  } catch (error) {
    document.getElementById('participation-list-container').innerHTML = `
      <div class="alert alert-danger">Error: ${error.message}</div>
    `;
  }
}

async function showCompleteMatchModal(matchId) {
  const container = document.getElementById('match-modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="modal-title">Finalize Match</h3>
          <button class="close-btn" id="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p>Are you ready to mark this match as <strong>Completed</strong>?</p>
          <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 8px;">
            Completing the match will lock player participations and trigger ball fee and match entry fee dues. Make sure participation logs are saved first.
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="confirm-complete-btn">Mark Completed</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => { container.innerHTML = ''; };
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-modal').addEventListener('click', closeModal);

  document.getElementById('confirm-complete-btn').addEventListener('click', async () => {
    try {
      await store.apiRequest(`/matches/${matchId}`, 'PUT', { status: 'completed' });
      closeModal();
      renderMatches();
    } catch (err) {
      alert('Failed to complete match: ' + err.message);
    }
  });
}
