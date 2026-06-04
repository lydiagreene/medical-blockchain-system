import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

import client from '../api/client'
import { login, register, getMe, logout, requestPasswordReset, confirmPasswordReset } from '../api/auth'

beforeEach(() => vi.clearAllMocks())

describe('auth API wrappers', () => {
  it('login posts correct payload', async () => {
    client.post.mockResolvedValue({ data: { token: 'abc', user: { id: 1 } } })
    const res = await login('testuser', 'password123')
    expect(client.post).toHaveBeenCalledWith('/auth/login/', { username: 'testuser', password: 'password123' })
    expect(res.data.token).toBe('abc')
  })

  it('register sends payload', async () => {
    client.post.mockResolvedValue({ data: { detail: 'Account created.' } })
    await register({ username: 'newuser', email: 'e@e.com', password: 'pass1234', role: 'VERIFIER' })
    expect(client.post).toHaveBeenCalledWith('/auth/register/', {
      username: 'newuser', email: 'e@e.com', password: 'pass1234', role: 'VERIFIER',
    })
  })

  it('getMe calls correct endpoint', async () => {
    client.get.mockResolvedValue({ data: { id: 1, username: 'u' } })
    const res = await getMe()
    expect(client.get).toHaveBeenCalledWith('/auth/me/')
    expect(res.data.username).toBe('u')
  })

  it('logout calls correct endpoint', async () => {
    client.post.mockResolvedValue({ data: {} })
    await logout()
    expect(client.post).toHaveBeenCalledWith('/auth/logout/')
  })

  it('requestPasswordReset posts email', async () => {
    client.post.mockResolvedValue({ data: { detail: 'If that email…' } })
    await requestPasswordReset('user@example.com')
    expect(client.post).toHaveBeenCalledWith('/auth/password-reset/', { email: 'user@example.com' })
  })

  it('confirmPasswordReset posts uid/token/password', async () => {
    client.post.mockResolvedValue({ data: { detail: 'Password reset.' } })
    await confirmPasswordReset('uid123', 'tok456', 'newpass!')
    expect(client.post).toHaveBeenCalledWith('/auth/password-reset-confirm/', {
      uid: 'uid123', token: 'tok456', new_password: 'newpass!',
    })
  })
})
