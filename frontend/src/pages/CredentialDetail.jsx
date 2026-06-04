import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle, XCircle, ExternalLink, FileText, ImageIcon,
  RefreshCw, Download, ShieldCheck, AlertTriangle, Loader2,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { getCredential, downloadCertificate, getBlockchainStatus } from '../api/credentials'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import useDocumentTitle from '../hooks/useDocumentTitle'
import client from '../api/client'

const CARD = { background: 'var(--app-card)', border: '1px solid var(--app-card-bdr)', borderRadius: 16 }
const INP  = { background: 'var(--app-input)', border: '1px solid var(--app-card-bdr)', color: 'var(--app-text)', outline: 'none', transition: 'border-color 0.15s' }

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--app-muted)', marginBottom: 3 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text)', margin: 0 }}>{value}</p>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--app-muted)', marginBottom: 16 }}>{children}</p>
  )
}

export default function CredentialDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [cred, setCred]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [renewOpen, setRenewOpen]     = useState(false)
  const [newExpiry, setNewExpiry]     = useState('')
  const [renewing, setRenewing]       = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [chainStatus, setChainStatus] = useState(null)
  const [chainLoading, setChainLoading] = useState(false)

  useDocumentTitle(cred ? cred.practitioner_name : 'Credential')

  useEffect(() => {
    getCredential(id)
      .then(r => setCred(r.data))
      .catch(() => navigate(-1))
      .finally(() => setLoading(false))
  }, [id])

  const handleRenew = async e => {
    e.preventDefault()
    setRenewing(true)
    try {
      const { data } = await client.post(`/credentials/${id}/renew/`, { license_expiry_date: newExpiry })
      toast(data.detail, 'success')
      setCred(c => ({ ...c, license_expiry_date: data.license_expiry_date, renewal_count: data.renewal_count, status: data.status }))
      setRenewOpen(false)
    } catch (err) {
      toast(err.response?.data?.detail || err.response?.data?.license_expiry_date || 'Renewal failed.', 'error')
    } finally { setRenewing(false) }
  }

  const handleDownloadCertificate = async () => {
    setDownloading(true)
    try {
      const res = await downloadCertificate(id)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificate_${cred.license_number?.replace(/\//g, '-') ?? id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast('Certificate downloaded.', 'success')
    } catch {
      toast('Certificate download failed.', 'error')
    } finally { setDownloading(false) }
  }

  const handleCheckChain = async () => {
    setChainLoading(true)
    try {
      const { data } = await getBlockchainStatus(id)
      setChainStatus(data)
    } catch (err) {
      toast(err.response?.data?.detail || 'Blockchain check failed.', 'error')
    } finally { setChainLoading(false) }
  }

  const role = user?.is_superuser ? 'ADMIN' : user?.role
  const canRenew  = role === 'ADMIN' || (role === 'ISSUER' && cred?.issued_by === user?.username)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--app-card-bdr)', borderTopColor: 'var(--clr-accent)', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
  if (!cred) return null

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* back */}
      <button onClick={() => navigate(-1)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--app-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--app-sub)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--app-muted)'}>
        <ArrowLeft size={15} />Back
      </button>

      {/* header card */}
      <div style={{ ...CARD, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--app-text)', margin: 0 }}>
              {cred.practitioner_name}
            </h1>
            <p style={{ fontSize: 13, marginTop: 4, color: 'var(--app-sub)' }}>
              {cred.qualification}{cred.specialization ? ` · ${cred.specialization}` : ''}
            </p>
          </div>
          <StatusBadge status={cred.status} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '16px 28px' }}>
          <InfoRow label="License Number"     value={cred.license_number} />
          <InfoRow label="Practitioner ID"    value={cred.practitioner_id} />
          <InfoRow label="Institution"        value={cred.institution_of_study} />
          <InfoRow label="Year of Graduation" value={cred.year_of_graduation} />
          <InfoRow label="License Expiry"     value={cred.license_expiry_date} />
          <InfoRow label="Date of Birth"      value={cred.date_of_birth} />
          <InfoRow label="Issued By"          value={cred.issued_by} />
          {cred.issuing_institution_name && (
            <InfoRow label="Issuing Institution" value={cred.issuing_institution_name} />
          )}
          {cred.renewal_count > 0 && <InfoRow label="Renewal Count" value={`${cred.renewal_count}×`} />}
        </div>

        {cred.status === 'REVOKED' && cred.revocation_reason && (
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <XCircle size={14} style={{ color: '#F87171', marginTop: 1, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F87171', marginBottom: 3 }}>
                Revocation Reason
              </p>
              <p style={{ fontSize: 13, color: '#FCA5A5', margin: 0 }}>{cred.revocation_reason}</p>
            </div>
          </div>
        )}
      </div>

      {/* Blockchain & Documents */}
      <div style={{ ...CARD, padding: 24 }}>
        <SectionTitle>Blockchain & Documents</SectionTitle>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cred.blockchain_tx_hash ? (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <ShieldCheck size={16} style={{ color: '#10B981', flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#10B981', margin: 0 }}>Blockchain Verified</p>
                  <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#34D399', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cred.blockchain_tx_hash}</p>
                </div>
                <a href={`https://sepolia.etherscan.io/tx/${cred.blockchain_tx_hash}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--clr-accent)', textDecoration: 'none', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                  Etherscan <ExternalLink size={11} />
                </a>
              </div>

              {chainStatus ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, fontSize: 12, background: 'var(--app-input)', border: '1px solid var(--app-card-bdr)' }}>
                  {chainStatus.pending
                    ? <><Loader2 size={13} style={{ color: 'var(--app-muted)', animation: 'spin 0.8s linear infinite' }} /><span style={{ color: 'var(--app-sub)' }}>Transaction pending…</span></>
                    : chainStatus.success === false
                      ? <><AlertTriangle size={13} style={{ color: '#FBBF24' }} /><span style={{ color: '#FCD34D' }}>Query failed: {chainStatus.error}</span></>
                      : <><CheckCircle size={13} style={{ color: '#10B981' }} />
                        <span style={{ color: '#10B981' }}>
                          {chainStatus.confirmations} confirmation{chainStatus.confirmations !== 1 ? 's' : ''} · Block {chainStatus.tx_block}
                        </span>
                      </>
                  }
                </div>
              ) : (
                <button onClick={handleCheckChain} disabled={chainLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--app-sub)', background: 'none', border: 'none', cursor: chainLoading ? 'not-allowed' : 'pointer', padding: 0, opacity: chainLoading ? 0.5 : 1 }}>
                  {chainLoading
                    ? <><Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} />Checking…</>
                    : <><RefreshCw size={12} />Check live confirmation status</>}
                </button>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <AlertTriangle size={13} style={{ color: '#FBBF24' }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: '#FCD34D' }}>Not yet recorded on blockchain.</span>
            </div>
          )}

          {cred.document_url && (
            <a href={cred.document_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, textDecoration: 'none', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              <FileText size={16} style={{ color: '#60A5FA', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#60A5FA', margin: 0 }}>Credential Document (IPFS)</p>
                <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#93C5FD', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cred.ipfs_document_hash}</p>
              </div>
              <ExternalLink size={13} style={{ color: '#60A5FA', flexShrink: 0 }} />
            </a>
          )}

          {cred.photo_url && (
            <a href={cred.photo_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, textDecoration: 'none', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              <ImageIcon size={16} style={{ color: '#A78BFA', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#A78BFA', margin: 0 }}>Practitioner Photo (IPFS)</p>
                <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#C4B5FD', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cred.ipfs_photo_hash}</p>
              </div>
              <ExternalLink size={13} style={{ color: '#A78BFA', flexShrink: 0 }} />
            </a>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ ...CARD, padding: 24 }}>
        <SectionTitle>Actions</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button onClick={handleDownloadCertificate} disabled={downloading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: downloading ? 'not-allowed' : 'pointer', background: 'var(--clr-accent)', color: '#060D1F', opacity: downloading ? 0.6 : 1, transition: 'opacity 0.15s' }}>
            {downloading ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Download size={15} />}
            {downloading ? 'Downloading…' : 'Download Certificate'}
          </button>

          {canRenew && cred.status !== 'REVOKED' && (
            <button onClick={() => setRenewOpen(o => !o)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer', background: 'rgba(59,130,246,0.08)', color: '#60A5FA', transition: 'opacity 0.15s' }}>
              <RefreshCw size={15} />Renew License
            </button>
          )}
        </div>

        {renewOpen && (
          <form onSubmit={handleRenew} style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'var(--app-input)', border: '1px solid var(--app-card-bdr)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--app-muted)' }}>
              New Expiry Date
            </label>
            <input type="date" required value={newExpiry} onChange={e => setNewExpiry(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{ ...INP, maxWidth: 240, padding: '10px 12px', borderRadius: 10, fontSize: 13 }}
              onFocus={e => e.target.style.borderColor = 'var(--clr-accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--app-card-bdr)'} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={renewing}
                style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: renewing ? 'not-allowed' : 'pointer', background: '#3B82F6', color: '#fff', opacity: renewing ? 0.6 : 1 }}>
                {renewing ? 'Renewing…' : 'Confirm Renewal'}
              </button>
              <button type="button" onClick={() => setRenewOpen(false)}
                style={{ padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid var(--app-card-bdr)', cursor: 'pointer', background: 'var(--app-card)', color: 'var(--app-sub)' }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
