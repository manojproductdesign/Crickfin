import { store } from '../state.js';
import { renderLayout, bindLayoutEvents } from './layout.js';
import { ICON_SPINNER } from '../assets/icons.js';

export async function renderSettings() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  const state = store.getState();
  const user = state.user;

  appEl.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
      <div style="text-align: center; color: var(--text-muted);">
        <div style="margin-bottom: 12px; display: flex; justify-content: center;">${ICON_SPINNER}</div>
        Loading settings...
      </div>
    </div>
  `;

  let costPerBallVal = 10.0;
  if (user.role === 'admin') {
    try {
      const feeConfig = await store.fetchBallFeeConfig();
      if (feeConfig && feeConfig.cost_per_ball !== undefined) {
        costPerBallVal = parseFloat(feeConfig.cost_per_ball);
      }
    } catch (err) {
      console.error('Failed to load ball fee config:', err);
    }
  }

  const content = `
    <div class="grid-2" style="align-items: start; gap: 24px;">
      <!-- Profile Card -->
      <div class="card">
        <h3 class="card-title">Update Profile</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
          Edit your name, email address, and phone number below.
        </p>
        <div id="profile-alert-container"></div>
        <form id="profile-settings-form">
          <div class="form-group">
            <label for="set-name">Full Name</label>
            <input type="text" id="set-name" class="form-control" value="${user.name}" required />
          </div>
          <div class="form-group">
            <label for="set-email">Email Address</label>
            <input type="email" id="set-email" class="form-control" value="${user.email}" required />
          </div>
          <div class="form-group">
            <label for="set-phone">Phone Number</label>
            <input type="tel" id="set-phone" class="form-control" value="${user.phone}" style="font-family: var(--font-mono);" required />
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top: 8px;">Save Changes</button>
        </form>
      </div>

      <!-- Password Card -->
      <div class="card">
        <h3 class="card-title">Security & Password</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
          Change your password. Must contain at least one uppercase letter, one lowercase letter, and one number.
        </p>
        <div id="password-alert-container"></div>
        <form id="password-settings-form">
          <div class="form-group">
            <label for="set-current-pass">Current Password</label>
            <input type="password" id="set-current-pass" class="form-control" placeholder="••••••••" required />
          </div>
          <div class="form-group">
            <label for="set-new-pass">New Password</label>
            <input type="password" id="set-new-pass" class="form-control" placeholder="••••••••" required minlength="8" />
          </div>
          <div class="form-group">
            <label for="set-confirm-pass">Confirm New Password</label>
            <input type="password" id="set-confirm-pass" class="form-control" placeholder="••••••••" required minlength="8" />
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top: 8px;">Update Password</button>
        </form>
      </div>
    </div>

    ${user.role === 'admin' ? `
      <!-- League Configurations (Admin only) -->
      <div class="card" style="margin-top: 24px; max-width: 500px;">
        <h3 class="card-title">League Configuration</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
          Set the fee structure for match play. The ledger updates player dues dynamically based on these settings.
        </p>
        <div id="league-alert-container"></div>
        <form id="league-settings-form">
          <div class="form-group">
            <label for="set-cost-per-ball">Cost Per Ball (₹)</label>
            <input type="number" step="0.01" min="0" id="set-cost-per-ball" class="form-control" value="${costPerBallVal}" style="font-family: var(--font-mono);" required />
            <small style="display: block; margin-top: 4px; color: var(--text-muted); font-size: 0.75rem;">
              Recalculates the ball dues for matches played (Cost per Ball × total balls bowled & played).
            </small>
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top: 8px;">Save Settings</button>
        </form>
      </div>
    ` : ''}
  `;

  appEl.innerHTML = renderLayout(content, 'settings');
  bindLayoutEvents();
  bindSettingsEvents();
}

function displaySettingsAlert(containerId, message, type = 'danger') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert-${type}" role="alert" style="margin-bottom: 12px; font-size: 0.85rem; padding: 10px;">
      ${message}
    </div>
  `;
}

function bindSettingsEvents() {
  const state = store.getState();
  const user = state.user;

  // 1. Profile form
  const profileForm = document.getElementById('profile-settings-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('set-name').value.trim();
      const email = document.getElementById('set-email').value.trim();
      const phone = document.getElementById('set-phone').value.trim();
      const btn = profileForm.querySelector('button[type="submit"]');

      btn.disabled = true;
      btn.textContent = 'Saving...';
      try {
        const res = await store.updateProfile(name, email, phone);
        displaySettingsAlert('profile-alert-container', res.message || 'Profile updated successfully!', 'success');
      } catch (err) {
        displaySettingsAlert('profile-alert-container', err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
      }
    });
  }

  // 2. Password form
  const passwordForm = document.getElementById('password-settings-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('set-current-pass').value;
      const newPassword = document.getElementById('set-new-pass').value;
      const confirmPassword = document.getElementById('set-confirm-pass').value;
      const btn = passwordForm.querySelector('button[type="submit"]');

      if (newPassword !== confirmPassword) {
        displaySettingsAlert('password-alert-container', 'New passwords do not match');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Updating...';
      try {
        const res = await store.changePassword(currentPassword, newPassword);
        displaySettingsAlert('password-alert-container', res.message || 'Password updated successfully!', 'success');
        passwordForm.reset();
      } catch (err) {
        displaySettingsAlert('password-alert-container', err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Update Password';
      }
    });
  }

  // 3. League settings form (Admin only)
  if (user.role === 'admin') {
    const leagueForm = document.getElementById('league-settings-form');
    if (leagueForm) {
      leagueForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const costPerBall = parseFloat(document.getElementById('set-cost-per-ball').value);
        const btn = leagueForm.querySelector('button[type="submit"]');

        btn.disabled = true;
        btn.textContent = 'Saving...';
        try {
          const res = await store.updateBallFeeConfig(costPerBall);
          displaySettingsAlert('league-alert-container', res.message || 'League configurations saved!', 'success');
        } catch (err) {
          displaySettingsAlert('league-alert-container', err.message);
        } finally {
          btn.disabled = false;
          btn.textContent = 'Save Settings';
        }
      });
    }
  }
}
