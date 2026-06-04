import { useState } from 'react'
import { Search, CheckCircle, XCircle, AlertTriangle, ExternalLink, ShieldCheck, Copy, Check } from 'lucide-react'
import { publicVerify } from '../../api/credentials'
import StatusBadge from '../../components/StatusBadge'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import { motion, AnimatePresence } from 'framer-motion'

const CARD = { background: 'var(--app-card)', border: '1px solid var(--app-card-bdr)', borderRadius: 16 }
const INP  = { background: 'var(--app-input)', border: '1px solid var(--app-card-bdr)', color: 'var(--app-text)', outline: 'none', transition: 'border-color 0.15s' }

export default function VerifyCredential() {
  useDocumentTitle('Verify Credential')
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)

  const handleSearch = async e => {
    e.preventDefault()
    if (!query.trim()) return
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const { data } = await publicVerify(query.trim().toUpperCase())
      setResult(data)
    } catch (err) {
      setError(err.response?.status === 404
        ? 'No credential found with this license number.'
        : 'Verification failed. Please try again.')
    } finally { setLoading(false) }
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/verify?q=${encodeURIComponent(query.trim().toUpperCase())}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const isValid = result?.status === 'ACTIVE' && result?.blockchain_active !== false

  return (
    <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--app-text)', margin: 0 }}>
          Verify Credential
        </h1>
        <p style={{ fontSize: 13, marginTop: 4, color: 'var(--app-muted)' }}>
          Enter a UMDPC license number to verify a practitioner
        </p>
      </div>

      {/* search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--app-muted)', pointerEvents: 'none' }} />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="e.g. UMDPC/2024/12345"
            style={{ ...INP, width: '100%', fontSize: 13, padding: '12px 16px 12px 44px', borderRadius: 16, boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = 'var(--clr-accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--app-card-bdr)'} />
        </div>
        <button type="submit" disabled={loading || !query.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 16, fontSize: 13, fontWeight: 700, border: 'none', cursor: loading || !query.trim() ? 'not-allowed' : 'pointer', background: 'var(--clr-accent)', color: '#060D1F', opacity: loading || !query.trim() ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          {loading ? 'Checking…' : <><Search size={15} />Verify</>}
        </button>
      </form>

      {/* error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <XCircle size={17} style={{ color: '#F87171', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, fontWeight: 500, color: '#F87171', margin: 0 }}>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* status banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderRadius: 14,
              background: isValid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${isValid ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            }}>
              {isValid
                ? <CheckCircle size={22} style={{ color: '#10B981', flexShrink: 0 }} />
                : <XCircle size={22} style={{ color: '#F87171', flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 800, fontSize: 14, color: isValid ? '#10B981' : '#F87171', margin: 0 }}>
                  {isValid ? 'Credential Verified — Valid & Active' : `Credential ${result.status}`}
                </p>
                <p style={{ fontSize: 12, marginTop: 2, color: isValid ? '#34D399' : '#FCA5A5' }}>
                  {isValid
                    ? 'This practitioner holds a valid, blockchain-verified credential.'
                    : 'This credential is not currently active.'}
                </p>
              </div>
              {/* shareable copy-link */}
              <button onClick={handleCopyLink}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid var(--app-card-bdr)', background: 'var(--app-card)', color: 'var(--app-sub)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                title="Copy shareable verify link">
                {copied ? <><Check size={12} style={{ color: '#10B981' }} /><span style={{ color: '#10B981' }}>Copied!</span></> : <><Copy size={12} />Share</>}
              </button>
            </div>

            {/* info card */}
            <div style={{ ...CARD, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                {/* photo */}
                <div style={{ flexShrink: 0 }}>
                  {result.photo_url ? (
                    <img src={result.photo_url} alt={result.practitioner_name}
                      style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', border: `2px solid ${isValid ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}
                      onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }} />
                  ) : null}
                  <div style={{
                    width: 80, height: 80, borderRadius: 12, background: 'var(--app-input)', border: '2px solid var(--app-card-bdr)',
                    display: result.photo_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 800, color: 'var(--app-muted)',
                  }}>
                    {result.practitioner_name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, minWidth: 0 }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--app-text)', margin: 0 }}>
                      {result.practitioner_name}
                    </h2>
                    <p style={{ fontSize: 13, marginTop: 4, color: 'var(--app-sub)' }}>
                      {result.qualification}{result.specialization ? ` · ${result.specialization}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={result.status} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px 28px' }}>
                {[
                  ['License Number',     result.license_number],
                  ['Institution',        result.institution_of_study],
                  ['Year of Graduation', result.year_of_graduation],
                  ['License Expires',    result.license_expiry_date],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--app-muted)', marginBottom: 3 }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text)', margin: 0 }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* blockchain */}
              {result.blockchain_tx_hash && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--app-card-bdr)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <ShieldCheck size={14} style={{ color: '#10B981' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10B981' }}>
                      Blockchain Verified
                    </span>
                  </div>
                  <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--app-muted)', marginBottom: 6 }}>{result.blockchain_tx_hash}</p>
                  <a href={`https://sepolia.etherscan.io/tx/${result.blockchain_tx_hash}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--clr-accent)', textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                    View on Etherscan <ExternalLink size={11} />
                  </a>
                </div>
              )}

              {result.blockchain_active === false && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginTop: 12, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <AlertTriangle size={14} style={{ color: '#FBBF24' }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#FCD34D' }}>
                    On-chain status does not match the database record.
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
