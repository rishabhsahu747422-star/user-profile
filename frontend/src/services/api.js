const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

let authToken = localStorage.getItem("ve_loop_token") || null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem("ve_loop_token", token);
  } else {
    localStorage.removeItem("ve_loop_token");
  }
};

export const getAuthToken = () => authToken;

/**
 * Reusable request helper for communicating with the backend API.
 * Uses the configured API_BASE_URL (defaults to /api via Vite proxy).
 */
export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const currentToken = getAuthToken();
  if (currentToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage = data?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { method: "GET", ...options }),
  post: (endpoint, body, options = {}) => request(endpoint, { method: "POST", body, ...options }),
  put: (endpoint, body, options = {}) => request(endpoint, { method: "PUT", body, ...options }),
  patch: (endpoint, body, options = {}) => request(endpoint, { method: "PATCH", body, ...options }),
  delete: (endpoint, options = {}) => request(endpoint, { method: "DELETE", ...options }),
  checkHealth: () => request("/health"),
  auth: {
    register: async (credentials) => {
      const result = await request("/auth/register", { method: "POST", body: credentials });
      if (result?.token) {
        setAuthToken(result.token);
      }
      return result;
    },
    login: async (credentials) => {
      const result = await request("/auth/login", { method: "POST", body: credentials });
      if (result?.token) {
        setAuthToken(result.token);
      }
      return result;
    },
    getMe: () => request("/auth/me"),
    logout: () => {
      setAuthToken(null);
    },
  },
  user: {
    getOverview: () => request("/users/me/overview"),
    getProfile: () => request("/users/me/profile"),
    getWallet: () => request("/users/me/wallet"),
    getProgress: () => request("/users/me/progress"),
    getAchievements: () => request("/users/me/achievements"),
    claimAchievement: (id) => request(`/users/me/achievements/${id}/claim`, { method: "POST" }),
    getReferrals: () => request("/users/me/referrals"),
    getReferralHistory: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/users/me/referrals/history${query ? `?${query}` : ""}`);
    },
    createWithdrawal: (data) => request("/users/me/withdrawals", { method: "POST", body: data }),
    getWithdrawalSummary: () => request("/users/me/withdrawals/summary"),
    getWithdrawals: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/users/me/withdrawals${query ? `?${query}` : ""}`);
    },
    getWithdrawal: (id) => request(`/users/me/withdrawals/${id}`),
    cancelWithdrawal: (id, reason) =>
      request(`/users/me/withdrawals/${id}/cancel`, { method: "POST", body: { reason } }),
  },
  referral: {
    validateCode: (code) => request(`/referrals/validate/${encodeURIComponent(code)}`),
  },
  admin: {
    getOverview: () => request("/admin/overview"),
    getUsers: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/admin/users${query ? `?${query}` : ""}`);
    },
    getUserDetails: (id) => request(`/admin/users/${id}`),
    updateUserStatus: (id, data) =>
      request(`/admin/users/${id}/status`, { method: "PATCH", body: data }),
    getWithdrawals: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/admin/withdrawals${query ? `?${query}` : ""}`);
    },
    getWithdrawal: (id) => request(`/admin/withdrawals/${id}`),
    reviewWithdrawal: (id, data) =>
      request(`/admin/withdrawals/${id}/review`, { method: "POST", body: data }),
    settleWithdrawal: (id, data = {}) =>
      request(`/admin/withdrawals/${id}/settle`, { method: "POST", body: data }),
    getAuditLogs: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/admin/audit-logs${query ? `?${query}` : ""}`);
    },
  },
};

export default api;
