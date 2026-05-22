import { store } from '../state.js';
import { navigateTo } from '../router.js';
import { ICON_LOGO } from '../assets/icons.js';

export function renderLogin() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  appEl.innerHTML = `
    <div class="auth-page fade-in">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">${ICON_LOGO}</div>
          <h1 class="auth-title">Crickfin</h1>
          <p class="auth-subtitle">Cricket League Management System</p>
        </div>
        
        <div id="auth-alert-container"></div>
 
        <form id="login-form">
          <div class="form-group">
            <label for="login-email">Email or Phone</label>
            <input type="text" id="login-email" class="form-control" placeholder="enter email or phone" required />
          </div>
          <div class="form-group">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" class="form-control" placeholder="••••••••" required />
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 8px;">Log In</button>
        </form>

        <div class="auth-footer">
          Don't have an account? <a href="#register" id="to-register">Register here</a>
        </div>
      </div>
    </div>
  `;

  bindLoginEvents();
}

export function renderRegister() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  appEl.innerHTML = `
    <div class="auth-page fade-in">
      <div class="auth-card" style="max-width: 480px;">
        <div class="auth-header">
          <div class="auth-logo">${ICON_LOGO}</div>
          <h1 class="auth-title">Create Account</h1>
          <p class="auth-subtitle">Join the Crickfin League</p>
        </div>
        
        <div id="auth-alert-container"></div>

        <form id="register-form">
          <div class="form-group">
            <label for="reg-name">Full Name</label>
            <input type="text" id="reg-name" class="form-control" placeholder="John Doe" required />
          </div>
          <div class="form-group">
            <label for="reg-email">Email Address</label>
            <input type="email" id="reg-email" class="form-control" placeholder="john@example.com" required />
          </div>
          <div class="form-group">
            <label for="reg-phone">Phone Number</label>
            <input type="tel" id="reg-phone" class="form-control" placeholder="9999999999" style="font-family: var(--font-mono);" required />
          </div>
          <div class="form-group">
            <label for="reg-password">Password</label>
            <input type="password" id="reg-password" class="form-control" placeholder="••••••••" required minlength="8" aria-describedby="reg-password-help" />
            <small id="reg-password-help" class="form-text text-muted" style="display: block; margin-top: 4px; font-size: 0.8rem; opacity: 0.85;">
              Must be at least 8 characters, containing at least one uppercase, one lowercase letter, and one number.
            </small>
          </div>
          <div class="form-group">
            <label for="reg-role">Register As</label>
            <select id="reg-role" class="form-control" required>
              <option value="player" selected>Player (Access own statistics & fees)</option>
              <option value="admin">Admin (Full league administration)</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 8px;">Register</button>
        </form>

        <div class="auth-footer">
          Already have an account? <a href="#login" id="to-login">Log in here</a>
        </div>
      </div>
    </div>
  `;

  bindRegisterEvents();
}

function displayAlert(containerId, message, type = 'danger') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert-${type}" role="alert" aria-live="assertive">
      ${message}
    </div>
  `;
}

function bindLoginEvents() {
  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        const user = await store.login(email, password);
        if (user.role === 'admin') {
          navigateTo('#dashboard');
        } else {
          navigateTo('#player-dashboard');
        }
      } catch (err) {
        displayAlert('auth-alert-container', err.message);
      }
    });
  }

  const toRegister = document.getElementById('to-register');
  if (toRegister) {
    toRegister.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('#register');
    });
  }
}

function bindRegisterEvents() {
  const form = document.getElementById('register-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const password = document.getElementById('reg-password').value;
      const role = document.getElementById('reg-role').value;

      try {
        const res = await store.register(name, email, phone, password, role);
        displayAlert('auth-alert-container', res.message, 'success');
        form.reset();
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigateTo('#login');
        }, 3000);
      } catch (err) {
        displayAlert('auth-alert-container', err.message);
      }
    });
  }

  const toLogin = document.getElementById('to-login');
  if (toLogin) {
    toLogin.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('#login');
    });
  }
}
