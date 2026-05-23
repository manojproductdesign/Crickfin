import { store } from './state.js';

// Route configurations
const ROUTES = {
  login: { path: '#login', role: 'guest' },
  register: { path: '#register', role: 'guest' },
  dashboard: { path: '#dashboard', role: 'admin' },
  players: { path: '#players', role: 'admin' },
  matches: { path: '#matches', role: 'admin' },
  payments: { path: '#payments', role: 'admin' },
  expenses: { path: '#expenses', role: 'admin' },
  teams: { path: '#teams', role: 'admin' },
  reports: { path: '#reports', role: 'admin' },
  'player-dashboard': { path: '#player-dashboard', role: 'player' },
  settings: { path: '#settings', role: 'user' }
};

// Route handlers registry
const viewHandlers = {};

export function registerView(viewName, renderFn) {
  viewHandlers[viewName] = renderFn;
}

export function navigateTo(hash) {
  window.location.hash = hash;
}

function handleRoute() {
  const currentHash = window.location.hash || '#login';
  const state = store.getState();

  // Find matching route key
  let targetView = 'login';
  let routeConfig = ROUTES.login;

  for (const [key, value] of Object.entries(ROUTES)) {
    if (value.path === currentHash) {
      targetView = key;
      routeConfig = value;
      break;
    }
  }

  // Auth checks
  if (routeConfig.role !== 'guest') {
    if (!state.token || !state.user) {
      // Not logged in, redirect to login
      navigateTo('#login');
      return;
    }

    // Role check
    if (routeConfig.role === 'admin' && state.user.role !== 'admin') {
      // Player trying to access Admin page, redirect to Player Dashboard
      navigateTo('#player-dashboard');
      return;
    }

    if (routeConfig.role === 'player' && state.user.role !== 'player') {
      // Admin trying to access Player Dashboard, redirect to Admin Dashboard
      navigateTo('#dashboard');
      return;
    }
  } else {
    // Guest route but already logged in, redirect to respective dashboard
    if (state.token && state.user) {
      if (state.user.role === 'admin') {
        navigateTo('#dashboard');
      } else {
        navigateTo('#player-dashboard');
      }
      return;
    }
  }

  // Update store view state
  store.setState({ currentView: targetView });

  // Call the view render function if registered
  if (viewHandlers[targetView]) {
    viewHandlers[targetView]();
  } else {
    console.error(`No render handler registered for view: ${targetView}`);
    // Fallback
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.innerHTML = `
        <div class="error-container">
          <h2>Page Not Found</h2>
          <p>The requested page was not found or is currently under construction.</p>
          <a href="#" class="btn btn-primary">Go to Home</a>
        </div>
      `;
    }
  }
}

export function initRouter() {
  // Listen for hash changes
  window.addEventListener('hashchange', handleRoute);
  
  // Handle initial page load
  handleRoute();
}
