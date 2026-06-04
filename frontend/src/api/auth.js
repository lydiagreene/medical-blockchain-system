import client from './client'

export const login = (username, password) =>
  client.post('/auth/login/', { username, password })

export const register = data =>
  client.post('/auth/register/', data)

export const getMe = () =>
  client.get('/auth/me/')

export const logout = () =>
  client.post('/auth/logout/')

export const getStats = () =>
  client.get('/stats/')

export const requestPasswordReset = email =>
  client.post('/auth/password-reset/', { email })

export const confirmPasswordReset = (uid, token, new_password) =>
  client.post('/auth/password-reset-confirm/', { uid, token, new_password })

// ── Two-Factor Authentication ──────────────────────────────────────────────

export const twoFactorSetup = partial_token =>
  client.post('/auth/2fa/setup/', { partial_token })

export const twoFactorConfirm = (partial_token, code) =>
  client.post('/auth/2fa/confirm/', { partial_token, code })

export const twoFactorVerify = (partial_token, code) =>
  client.post('/auth/2fa/verify/', { partial_token, code })

// ── Email verification ─────────────────────────────────────────────────────

export const sendVerificationEmail = email =>
  client.post('/auth/send-verification/', { email })

export const verifyEmail = (uid, token) =>
  client.post('/auth/verify-email/', { uid, token })
