import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

import client from '../api/client'
import {
  listCredentials,
  getCredential,
  revokeCredential,
  publicVerify,
} from '../api/credentials'

beforeEach(() => vi.clearAllMocks())

describe('credentials API wrappers', () => {
  it('listCredentials fetches paginated list', async () => {
    client.get.mockResolvedValue({ data: { results: [], count: 0 } })
    await listCredentials({ status: 'ACTIVE' })
    expect(client.get).toHaveBeenCalledWith('/credentials/', { params: { status: 'ACTIVE' } })
  })

  it('getCredential fetches by id', async () => {
    client.get.mockResolvedValue({ data: { credential_id: 'abc-123' } })
    await getCredential('abc-123')
    expect(client.get).toHaveBeenCalledWith('/credentials/abc-123/')
  })

  it('revokeCredential posts with reason', async () => {
    client.post.mockResolvedValue({ data: { detail: 'Revoked.' } })
    await revokeCredential('cred-id', 'Fraud detected')
    expect(client.post).toHaveBeenCalledWith('/credentials/cred-id/revoke/', { reason: 'Fraud detected' })
  })

  it('revokeCredential defaults reason to empty string', async () => {
    client.post.mockResolvedValue({ data: { detail: 'Revoked.' } })
    await revokeCredential('cred-id')
    expect(client.post).toHaveBeenCalledWith('/credentials/cred-id/revoke/', { reason: '' })
  })

  it('publicVerify calls public endpoint', async () => {
    client.get.mockResolvedValue({ data: { status: 'ACTIVE' } })
    await publicVerify('UMDPC-2024-001')
    expect(client.get).toHaveBeenCalledWith('/verify/UMDPC-2024-001/')
  })
})
