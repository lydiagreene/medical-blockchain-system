import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StatusBadge from '../components/StatusBadge'

describe('StatusBadge', () => {
  it('renders ACTIVE status with green styling', () => {
    render(<StatusBadge status="ACTIVE" />)
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
  })

  it('renders REVOKED status', () => {
    render(<StatusBadge status="REVOKED" />)
    expect(screen.getByText('REVOKED')).toBeInTheDocument()
  })

  it('renders EXPIRED status', () => {
    render(<StatusBadge status="EXPIRED" />)
    expect(screen.getByText('EXPIRED')).toBeInTheDocument()
  })

  it('renders PENDING status', () => {
    render(<StatusBadge status="PENDING" />)
    expect(screen.getByText('PENDING')).toBeInTheDocument()
  })
})
