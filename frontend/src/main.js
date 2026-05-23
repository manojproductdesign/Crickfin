import './style.css';
import { store } from './state.js';
import { registerView, initRouter, navigateTo } from './router.js';

// Import Views
import { renderLogin, renderRegister } from './views/login.js';
import { renderAdminDashboard, renderPlayerDashboard } from './views/dashboard.js';
import { renderPlayers } from './views/players.js';
import { renderMatches } from './views/matches.js';
import { renderPayments } from './views/payments.js';
import { renderExpenses } from './views/expenses.js';
import { renderTeams } from './views/teams.js';
import { renderReports } from './views/reports.js';
import { renderSettings } from './views/settings.js';

// Register all views in router
registerView('login', renderLogin);
registerView('register', renderRegister);
registerView('dashboard', renderAdminDashboard);
registerView('players', renderPlayers);
registerView('matches', renderMatches);
registerView('payments', renderPayments);
registerView('expenses', renderExpenses);
registerView('teams', renderTeams);
registerView('reports', renderReports);
registerView('player-dashboard', renderPlayerDashboard);
registerView('settings', renderSettings);

// Handle Session Timeout (Auto-logout after 30 minutes / JWT expiry)
let sessionTimeoutId = null;

function setupSessionTimeout() {
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
    sessionTimeoutId = null;
  }

  const state = store.getState();
  if (state.token) {
    try {
      // Decode JWT payload
      const base64Url = state.token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      
      const expTime = payload.exp * 1000;
      const timeRemaining = expTime - Date.now();

      if (timeRemaining <= 0) {
        store.logout();
        alert('Session expired. Please log in again.');
      } else {
        sessionTimeoutId = setTimeout(() => {
          store.logout();
          alert('Session expired. Please log in again.');
        }, timeRemaining);
      }
    } catch (error) {
      console.error('Failed to parse auth token:', error);
      store.logout();
    }
  }
}

// Subscribe to store updates to handle redirect on logout or state change
store.subscribe((state) => {
  setupSessionTimeout();
  if (!state.token && window.location.hash !== '#login' && window.location.hash !== '#register') {
    navigateTo('#login');
  }
});

// Initialize Router & Session Management
document.addEventListener('DOMContentLoaded', () => {
  setupSessionTimeout();
  initRouter();
});
