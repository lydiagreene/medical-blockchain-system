import client from './client'

export const listCredentials = params =>
  client.get('/credentials/', { params })

export const getCredential = id =>
  client.get(`/credentials/${id}/`)

export const createCredential = data =>
  client.post('/credentials/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const revokeCredential = (id, reason = '') =>
  client.post(`/credentials/${id}/revoke/`, { reason })

export const renewCredential = (id, data) =>
  client.post(`/credentials/${id}/renew/`, data)

export const downloadCertificate = id =>
  client.get(`/credentials/${id}/certificate/`, { responseType: 'blob' })

export const getBlockchainStatus = id =>
  client.get(`/credentials/${id}/blockchain-status/`)

export const publicVerify = licenseNumber =>
  client.get(`/verify/${licenseNumber}/`)

export const verifyFace = data =>
  client.post('/biometrics/verify-face/', data)
