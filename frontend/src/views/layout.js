import { store } from '../state.js';
import { navigateTo } from '../router.js';
import {
  ICON_DASHBOARD,
  ICON_PLAYERS,
  ICON_MATCHES,
  ICON_PAYMENTS,
  ICON_EXPENSES,
  ICON_TEAMS,
  ICON_REPORTS,
  ICON_BURGER,
  ICON_LOGOUT,
  ICON_LOGO,
  ICON_SETTINGS
} from '../assets/icons.js';

export function renderLayout(contentHtml, activeView) {
  const state = store.getState();
  const user = state.user;

  if (!user) {
    return contentHtml; // No layout for login/register
  }

  // Define nav links based on role
  let menuHtml = '';
  if (user.role === 'admin') {
    const adminLinks = [
      { id: 'dashboard', label: 'Dashboard', icon: ICON_DASHBOARD, hash: '#dashboard' },
      { id: 'players', label: 'Players', icon: ICON_PLAYERS, hash: '#players' },
      { id: 'matches', label: 'Matches', icon: ICON_MATCHES, hash: '#matches' },
      { id: 'payments', label: 'Payments', icon: ICON_PAYMENTS, hash: '#payments' },
      { id: 'expenses', label: 'Expenses', icon: ICON_EXPENSES, hash: '#expenses' },
      { id: 'teams', label: 'Teams', icon: ICON_TEAMS, hash: '#teams' },
      { id: 'reports', label: 'Reports', icon: ICON_REPORTS, hash: '#reports' },
      { id: 'settings', label: 'Settings', icon: ICON_SETTINGS, hash: '#settings' }
    ];

    menuHtml = adminLinks.map(link => `
      <li class="menu-item ${activeView === link.id ? 'active' : ''}">
        <a href="${link.hash}">${link.icon} <span>${link.label}</span></a>
      </li>
    `).join('');
  } else {
    // Player Navigation
    menuHtml = `
      <li class="menu-item ${activeView === 'player-dashboard' ? 'active' : ''}">
        <a href="#player-dashboard">${ICON_DASHBOARD} <span>My Dashboard</span></a>
      </li>
      <li class="menu-item ${activeView === 'settings' ? 'active' : ''}">
        <a href="#settings">${ICON_SETTINGS} <span>Settings</span></a>
      </li>
    `;
  }

  return `
    <div class="app-container">
      <!-- Sidebar -->
      <aside class="sidebar" id="sidebar" aria-label="Sidebar Navigation" role="complementary">
        <div class="sidebar-logo">
          <div class="logo-icon">${ICON_LOGO}</div>
          <span class="logo-text">Crickfin</span>
        </div>
        <nav class="sidebar-nav" aria-label="Main Menu">
          <ul class="sidebar-menu">
            ${menuHtml}
          </ul>
        </nav>
        <div class="sidebar-footer">
          <div class="user-info">
            <span class="user-name">${user.name}</span>
            <span class="user-role">${user.role}</span>
          </div>
          <button class="btn btn-secondary btn-sm" id="logout-btn" style="width: 100%;" aria-label="Log Out">
            ${ICON_LOGOUT} <span>Log Out</span>
          </button>
        </div>
      </aside>

      <!-- Mobile sidebar overlay -->
      <div class="sidebar-overlay" id="sidebar-overlay"></div>

      <!-- Main Panel -->
      <main class="main-content">
        <!-- Top bar -->
        <header class="topbar no-print">
          <button class="btn btn-secondary btn-sm" id="menu-toggle" style="display: none;" aria-label="Toggle Navigation" aria-expanded="false" aria-controls="sidebar">
            ${ICON_BURGER}
          </button>
          <h2 class="page-title" style="text-transform: capitalize;">${activeView.replace('-', ' ')}</h2>
          <div class="user-profile">
            <span>Welcome, <strong>${user.name}</strong></span>
          </div>
        </header>
        
        <!-- View Content -->
        <div class="fade-in">
          ${contentHtml}
        </div>
      </main>
    </div>
  `;
}

// Bind event handlers for layout container (logout, mobile toggles)
export function bindLayoutEvents() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      store.logout();
    });
  }

  // Mobile menu toggle
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (menuToggle && sidebar) {
    const isMobile = () => window.innerWidth <= 768;

    const openSidebar = () => {
      sidebar.classList.add('mobile-open');
      if (overlay) overlay.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent background scroll
      menuToggle.setAttribute('aria-expanded', 'true');
    };

    const closeSidebar = () => {
      sidebar.classList.remove('mobile-open');
      if (overlay) overlay.classList.remove('active');
      document.body.style.overflow = '';
      menuToggle.setAttribute('aria-expanded', 'false');
    };

    // Show/hide hamburger based on screen size
    if (isMobile()) {
      menuToggle.style.display = 'flex';
      menuToggle.setAttribute('aria-expanded', 'false');
    }

    window.addEventListener('resize', () => {
      if (isMobile()) {
        menuToggle.style.display = 'flex';
      } else {
        menuToggle.style.display = 'none';
        closeSidebar();
      }
    });

    // Toggle sidebar on hamburger click
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (sidebar.classList.contains('mobile-open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    // Close sidebar when overlay is tapped
    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }

    // Close sidebar when a menu link is clicked (mobile navigation)
    sidebar.querySelectorAll('.menu-item a').forEach(link => {
      link.addEventListener('click', () => {
        if (isMobile()) {
          closeSidebar();
        }
      });
    });

    // Close sidebar on outside click (fallback)
    document.addEventListener('click', (e) => {
      if (isMobile() && sidebar.classList.contains('mobile-open') &&
          !sidebar.contains(e.target) && e.target !== menuToggle && !menuToggle.contains(e.target)) {
        closeSidebar();
      }
    });
  }
}

