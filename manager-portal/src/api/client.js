const BASE = '/api';

function getToken() {
  return localStorage.getItem('mgr_token');
}

async function request(method, path, body, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !formData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: formData ? formData : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && path !== '/auth/login') {
    localStorage.removeItem('mgr_token');
    localStorage.removeItem('mgr_user');
    window.location.href = '/manager';
    return;
  }

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),

  // Auth
  login: (email, password) => request('POST', '/auth/login', { email, password }),

  // Dashboard
  dashboard: () => request('GET', '/admin/dashboard'),

  // Guards
  guards: () => request('GET', '/admin/guards'),
  guard: (id) => request('GET', `/admin/guards/${id}`),
  createGuard: (body) => request('POST', '/admin/guards', body),
  updateGuard: (id, body) => request('PUT', `/admin/guards/${id}`, body),

  // Sites
  sites: () => request('GET', '/admin/sites'),
  createSite: (body) => request('POST', '/admin/sites', body),
  updateSite: (id, body) => request('PUT', `/admin/sites/${id}`, body),
  deleteSite: (id) => request('DELETE', `/admin/sites/${id}`),

  // Shifts
  shifts: (params = '') => request('GET', `/admin/shifts${params}`),
  createShift: (body) => request('POST', '/admin/shifts', body),
  updateShift: (id, body) => request('PUT', `/admin/shifts/${id}`, body),
  deleteShift: (id) => request('DELETE', `/admin/shifts/${id}`),

  // Open Shifts
  openShifts: () => request('GET', '/admin/open-shifts'),
  createOpenShift: (body) => request('POST', '/admin/open-shifts', body),
  deleteOpenShift: (id) => request('DELETE', `/admin/open-shifts/${id}`),

  // Shift Swaps
  swaps: (status) => request('GET', `/admin/shift-swaps${status ? `?status=${status}` : ''}`),
  swapDecision: (id, action, reason) => request('POST', `/admin/shift-swaps/${id}/decision`, { action, reason }),

  // Timeclock
  timeclock: (params = '') => request('GET', `/admin/timeclock${params}`),
  updateTimeclock: (id, body) => request('PUT', `/admin/timeclock/${id}`, body),

  // Incidents
  incidents: (params = '') => request('GET', `/admin/incidents${params}`),
  updateIncident: (id, body) => request('PUT', `/admin/incidents/${id}`, body),

  // SOS
  sosActive: () => request('GET', '/sos/active'),
  sosHistory: () => request('GET', '/sos/history'),
  sosAck: (id) => request('POST', `/sos/${id}/acknowledge`),
  sosResolve: (id) => request('POST', `/sos/${id}/resolve`),

  // Payroll
  payroll: (params = '') => request('GET', `/admin/payroll${params}`),
  createPayroll: (body) => request('POST', '/admin/payroll', body),
  updatePayroll: (id, body) => request('PUT', `/admin/payroll/${id}`, body),
  calculatePayroll: (body) => request('POST', '/admin/payroll/calculate', body),

  // Announcements
  announcements: () => request('GET', '/admin/announcements'),
  createAnnouncement: (body) => request('POST', '/admin/announcements', body),
  deleteAnnouncement: (id) => request('DELETE', `/admin/announcements/${id}`),

  // Compliance
  compliance: () => request('GET', '/admin/compliance'),

  // Live locations
  liveLocations: () => request('GET', '/ops/live-locations'),
};
