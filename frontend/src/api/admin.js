import client from './client'

export const getPendingUsers = () =>
  client.get('/admin/users/')

export const approveUser = id =>
  client.post(`/admin/users/${id}/approve/`)

export const rejectUser = id =>
  client.post(`/admin/users/${id}/reject/`)

export const getAuditLog = (page = 1, extraParams = {}) =>
  client.get('/admin/audit-log/', { params: { page, ...extraParams } })

export const getFraudDashboard = (page = 1) =>
  client.get('/admin/fraud/', { params: { page } })

// ── Institution management ─────────────────────────────────────────────────

export const getInstitutions = (page = 1, q = '') =>
  client.get('/admin/institutions/', { params: { page, q } })

export const createInstitution = data =>
  client.post('/admin/institutions/', data)

export const updateInstitution = (id, data) =>
  client.patch(`/admin/institutions/${id}/`, data)

export const deactivateInstitution = id =>
  client.delete(`/admin/institutions/${id}/`)

// ── User management (all users) ────────────────────────────────────────────

export const getAllUsers = (q = '') =>
  client.get('/admin/users/all/', { params: { q } })

export const resetUserTotp = id =>
  client.post(`/admin/users/${id}/reset-2fa/`)

export const unlockUser = id =>
  client.post(`/admin/users/${id}/unlock/`)
