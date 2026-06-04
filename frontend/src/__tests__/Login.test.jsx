import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

// Mock hooks and API
vi.mock('../api/auth', () => ({ login: vi.fn() }))
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ signIn: vi.fn() }),
}))
// useNavigate mock
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import Login from '../pages/Login'
import { login } from '../api/auth'

beforeEach(() => vi.clearAllMocks())

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

describe('Login page', () => {
  it('renders username and password fields', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('your username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('renders sign in button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows error on failed login', async () => {
    login.mockRejectedValue({ response: { data: { detail: 'Invalid credentials.' } } })
    renderLogin()

    fireEvent.change(screen.getByPlaceholderText('your username'), { target: { value: 'baduser' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials.')).toBeInTheDocument()
    })
  })

  it('navigates to dashboard on successful login', async () => {
    login.mockResolvedValue({ data: { token: 'tok', user: { id: 1, username: 'u' } } })
    renderLogin()

    fireEvent.change(screen.getByPlaceholderText('your username'), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('renders forgot password link', () => {
    renderLogin()
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
  })

  it('renders register link', () => {
    renderLogin()
    expect(screen.getByText(/register/i)).toBeInTheDocument()
  })
})
