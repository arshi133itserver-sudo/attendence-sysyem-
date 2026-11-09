const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('arshi_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('arshi_token');
      localStorage.removeItem('arshi_user');
      window.location.href = '/login';
    }
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

function buildQueryString(params = {}) {
  const cleanParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'All' && value !== 'undefined') {
      cleanParams[key] = value;
    }
  }
  const q = new URLSearchParams(cleanParams).toString();
  return q ? `?${q}` : '';
}

export const authApi = {
  login: (credentials) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
  getMe: () => apiRequest('/auth/me')
};

export const employeeApi = {
  getAll: (params = {}) => {
    return apiRequest(`/employees${buildQueryString(params)}`);
  },
  getNextId: () => apiRequest('/employees/next-id'),
  getById: (id) => apiRequest(`/employees/${id}`),
  create: (data) =>
    apiRequest('/employees', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  update: (id, data) =>
    apiRequest(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  setAccount: (id, data) =>
    apiRequest(`/employees/${id}/account`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  delete: (id) =>
    apiRequest(`/employees/${id}`, {
      method: 'DELETE'
    })
};

export const rfidApi = {
  simulateScan: (cardUid, deviceId = 'TABLET_KIOSK_READER', timestamp = null) =>
    apiRequest('/rfid/simulate-scan', {
      method: 'POST',
      body: JSON.stringify({ cardUid, deviceId, timestamp: timestamp || new Date().toISOString() })
    }),
  getRawLogs: (params = {}) => {
    return apiRequest(`/rfid/raw-logs${buildQueryString(params)}`);
  }
};

export const attendanceApi = {
  getToday: () => apiRequest('/attendance/today'),
  getByDate: (date, department, search) => {
    return apiRequest(`/attendance/date${buildQueryString({ date, department, search })}`);
  },
  manualEntry: (payload) =>
    apiRequest('/attendance/manual', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  correctAttendance: (payload) =>
    apiRequest('/attendance/correct', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};

export const dashboardApi = {
  getStats: () => apiRequest('/dashboard/stats')
};

export const reportApi = {
  getDateWise: (date, department, search) => {
    return apiRequest(`/reports/date-wise${buildQueryString({ date, department, search })}`);
  },
  getMonthly: (employeeId, month) =>
    apiRequest(`/reports/monthly?employeeId=${employeeId}&month=${month}`)
};

export const settingsApi = {
  getSettings: () => apiRequest('/settings'),
  updateSettings: (data) =>
    apiRequest('/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  addHoliday: (data) =>
    apiRequest('/settings/holidays', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  deleteHoliday: (id) =>
    apiRequest(`/settings/holidays/${id}`, {
      method: 'DELETE'
    }),
  addDepartment: (data) =>
    apiRequest('/settings/departments', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  deleteDepartment: (id) =>
    apiRequest(`/settings/departments/${id}`, {
      method: 'DELETE'
    })
};

export const attendanceRequestApi = {
  submitSelfie: (data) =>
    apiRequest('/attendance-requests/selfie', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getMyRequests: () => apiRequest('/attendance-requests/my-requests'),
  getPending: () => apiRequest('/attendance-requests/pending'),
  getAll: (params = {}) => apiRequest(`/attendance-requests${buildQueryString(params)}`),
  approve: (id) =>
    apiRequest(`/attendance-requests/${id}/approve`, {
      method: 'POST'
    }),
  reject: (id, reason) =>
    apiRequest(`/attendance-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    })
};

export const zktecoApi = {
  getConfig: () => apiRequest('/zkteco/config'),
  updateConfig: (data) =>
    apiRequest('/zkteco/config', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  testConnection: (data = {}) =>
    apiRequest('/zkteco/test', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  syncLogs: (data = {}) =>
    apiRequest('/zkteco/sync', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  uploadLogFile: (content) =>
    apiRequest('/zkteco/upload-log', {
      method: 'POST',
      body: JSON.stringify({ content })
    })
};
