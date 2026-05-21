// Crickfin Client State Manager

const API_BASE = 'http://localhost:5000/api';

class StateStore {
  constructor() {
    this.state = {
      token: localStorage.getItem('crickfin_token') || null,
      user: JSON.parse(localStorage.getItem('crickfin_user')) || null,
      players: [],
      matches: [],
      teams: [],
      expenses: [],
      dashboard: null,
      currentView: 'login', // router will update this
      activePlayerDashboard: null // player specific cached summary
    };
    
    this.listeners = [];
  }

  // Subscribe to changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify listeners
  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Update specific state fields
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  // Get current state
  getState() {
    return this.state;
  }

  // API request wrapper
  async apiRequest(endpoint, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.state.token) {
      headers['Authorization'] = `Bearer ${this.state.token}`;
    }

    const config = {
      method,
      headers
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      
      if (response.status === 401 || response.status === 403) {
        // Token expired or invalid
        if (this.state.token) {
          this.logout();
          throw new Error('Session expired. Please log in again.');
        }
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }
      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      throw error;
    }
  }

  // Auth Operations
  async login(email, password) {
    const data = await this.apiRequest('/auth/login', 'POST', { email, password });
    localStorage.setItem('crickfin_token', data.token);
    localStorage.setItem('crickfin_user', JSON.stringify(data.user));
    this.setState({
      token: data.token,
      user: data.user,
      currentView: data.user.role === 'admin' ? 'dashboard' : 'player-dashboard'
    });
    return data.user;
  }

  async register(name, email, phone, password, role) {
    return await this.apiRequest('/auth/register', 'POST', { name, email, phone, password, role });
  }

  logout() {
    localStorage.removeItem('crickfin_token');
    localStorage.removeItem('crickfin_user');
    this.setState({
      token: null,
      user: null,
      currentView: 'login',
      dashboard: null,
      players: [],
      matches: [],
      teams: [],
      expenses: []
    });
  }

  // Fetch Data Operations
  async fetchDashboard() {
    if (this.state.user.role === 'admin') {
      const data = await this.apiRequest('/dashboard/summary');
      this.setState({ dashboard: data });
      return data;
    } else {
      const data = await this.apiRequest(`/dashboard/player/${this.state.user.id}`);
      this.setState({ activePlayerDashboard: data });
      return data;
    }
  }

  async fetchPlayers(search = '', teamId = '', status = '') {
    let queryParams = [];
    if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
    if (teamId) queryParams.push(`teamId=${teamId}`);
    if (status) queryParams.push(`status=${status}`);
    
    const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';
    const data = await this.apiRequest(`/players${queryString}`);
    this.setState({ players: data });
    return data;
  }

  async fetchMatches() {
    const data = await this.apiRequest('/matches');
    this.setState({ matches: data });
    return data;
  }

  async fetchTeams() {
    const data = await this.apiRequest('/teams');
    this.setState({ teams: data });
    return data;
  }

  async fetchExpenses(category = '', dateStart = '', dateEnd = '') {
    let queryParams = [];
    if (category) queryParams.push(`category=${category}`);
    if (dateStart) queryParams.push(`dateStart=${dateStart}`);
    if (dateEnd) queryParams.push(`dateEnd=${dateEnd}`);
    
    const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';
    const data = await this.apiRequest(`/expenses${queryString}`);
    this.setState({ expenses: data });
    return data;
  }
}

export const store = new StateStore();
