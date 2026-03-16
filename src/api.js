const API_BASE_URL = 'http://localhost:3001/api';

async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // JSON parse failed, use default message
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export const api = {
  // Assets
  getAssets: () => fetchApi('/assets'),
  getAsset: (id) => fetchApi(`/assets/${id}`),
  createAsset: (data) => fetchApi('/assets', { method: 'POST', body: JSON.stringify(data) }),
  updateAsset: (id, data) => fetchApi(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAsset: (id) => fetchApi(`/assets/${id}`, { method: 'DELETE' }),
  bulkDeleteAssets: (ids) => fetchApi('/assets', { method: 'DELETE', body: JSON.stringify(ids) }),
  bulkCreateAssets: (dataArray) => fetchApi('/assets', { method: 'POST', body: JSON.stringify(dataArray) }),

  // Audit Logs
  getAuditLogs: () => fetchApi('/auditLogs'),
  getAuditLogsByAsset: (assetId) => fetchApi(`/auditLogs/asset/${assetId}`),
  createAuditLog: (data) => fetchApi('/auditLogs', { method: 'POST', body: JSON.stringify(data) }),

  // Maintenance
  getMaintenances: () => fetchApi('/maintenance'),
  createMaintenance: (data) => fetchApi('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
  updateMaintenance: (id, data) => fetchApi(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  // Transfers
  getTransfers: () => fetchApi('/transfers'),
  createTransfer: (data) => fetchApi('/transfers', { method: 'POST', body: JSON.stringify(data) }),
};
