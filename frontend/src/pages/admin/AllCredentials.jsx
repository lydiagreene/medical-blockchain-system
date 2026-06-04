import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, RefreshCw, Download, CheckSquare, Square, XCircle, Trash2, X } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import { listCredentials, revokeCredential } from '../../api/credentials'
import { useToast } from '../../context/ToastContext'
import useDocumentTitle from '../../hooks/useDocumentTitle'

const STATUS_OPTS = ['', 'ACTIVE', 'REVOKED', 'EXPIRED', 'PENDING']

const CARD = { background: 'var(--app-card)', border: '1px solid var(--app-card-bdr)', borderRadius: 16 }
const INP  = { background: 'var(--app-input)', border: '1px solid var(--app-card-bdr)', color: 'var(--app-text)', outline: 'none', transition: 'border-color 0.15s' }

function exportCSV(rows) {
  const headers = ['Practitioner', 'Qualification', 'Specialization', 'License Number', 'Expiry', 'Status', 'Issued By']
  const lines = [
    headers.join(','),
    ...rows.map(c => [
      `"${c.practitioner_name ?? ''}"`,
      `"${c.qualification ?? ''}"`,
      `"${c.specialization ?? ''}"`,
      `"${c.license_number ?? ''}"`,
      `"${c.license_expiry_date ?? ''}"`,
      `"${c.status ?? ''}"`,
      `"${c.issued_by ?? ''}"`,
    ].join(','))
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `credentials_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function RevokeReasonModal({ count, practitionerName, onConfirm, onCancel }) {
  const [reason, setReason] = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div style={{ ...CARD, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--app-card-bdr)' }}>
          <h2 style={{ fontWeight: 800, fontSize: 15, color: 'var(--app-text)', margin: 0 }}>
            Revoke {count > 1 ? `${count} credentials` : `credential${practitionerName ? ` for ${practitionerName}` : ''}`}
          </h2>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-muted)', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '20px' }}>
          <p style={{ fontSize: 13, color: 'var(--app-sub)', marginBottom: 16 }}>
            This action cannot be undone. Optionally provide a reason that will be recorded.
          </p>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--app-muted)', marginBottom: 6 }}>
            Revocation Reason (optional)
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. License expired, fraud detected…"
            style={{ ...INP, width: '100%', padding: '10px 12px', borderRadius: 12, resize: 'none', fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#EF4444'}
            onBlur={e => e.target.style.borderColor = 'var(--app-card-bdr)'} />
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={() => onConfirm(reason)}
              style={{ flex: 1, padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.12)', color: '#F87171', transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              Revoke {count} Credential{count > 1 ? 's' : ''}
            </button>
            <button onClick={onCancel}
              style={{ padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600, border: '1px solid var(--app-card-bdr)', cursor: 'pointer', background: 'var(--app-input)', color: 'var(--app-sub)' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AllCredentials() {
  useDocumentTitle('All Credentials')
  const toast = useToast()
  const [data, setData]                   = useState([])
  const [loading, setLoading]             = useState(true)
  const [q, setQ]                         = useState('')
  const [statusFilter, setStatusFilter]   = useState('')
  const [revoking, setRevoking]           = useState(null)
  const [page, setPage]                   = useState(1)
  const [count, setCount]                 = useState(0)
  const [exporting, setExporting]         = useState(false)
  const [selected, setSelected]           = useState(new Set())
  const [bulkRevoking, setBulkRevoking]   = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [singleTarget, setSingleTarget]   = useState(null) // { id, name }

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      const params = { page }
      if (q.trim()) params.q = q.trim()
      if (statusFilter) params.status = statusFilter
      const { data: res } = await listCredentials(params)
      setData(res.results ?? res)
      setCount(res.count ?? (res.results ?? res).length)
    } finally { setLoading(false) }
  }, [q, statusFilter, page])

  useEffect(() => { load() }, [load])

  const handleRevoke = (id, name) => setSingleTarget({ id, name })

  const confirmSingleRevoke = async (reason) => {
    const { id, name } = singleTarget
    setSingleTarget(null)
    setRevoking(id)
    try {
      await revokeCredential(id, reason)
      toast(`Credential for ${name} revoked.`, 'success')
      load()
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to revoke credential.', 'error')
    } finally { setRevoking(null) }
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const params = {}
      if (q.trim()) params.q = q.trim()
      if (statusFilter) params.status = statusFilter
      params.page_size = 10000
      const { data: res } = await listCredentials(params)
      const rows = res.results ?? res
      exportCSV(rows)
      toast(`Exported ${rows.length} credentials.`, 'success')
    } catch {
      toast('Export failed.', 'error')
    } finally { setExporting(false) }
  }

  const activeRows   = data.filter(c => c.status === 'ACTIVE')
  const allActiveIds = new Set(activeRows.map(c => c.credential_id))
  const allSelected  = allActiveIds.size > 0 && [...allActiveIds].every(id => selected.has(id))
  const someSelected = selected.size > 0

  const toggleRow = id => setSelected(s => {
    const next = new Set(s)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleAll = () => {
    if (allSelected) {
      setSelected(s => { const n = new Set(s); allActiveIds.forEach(id => n.delete(id)); return n })
    } else {
      setSelected(s => new Set([...s, ...allActiveIds]))
    }
  }

  const clearSelection = () => setSelected(new Set())

  const handleBulkExport = () => {
    const rows = data.filter(c => selected.has(c.credential_id))
    exportCSV(rows)
    toast(`Exported ${rows.length} credentials.`, 'success')
  }

  const confirmBulkRevoke = async (reason) => {
    setShowBulkModal(false)
    setBulkRevoking(true)
    const ids = [...selected]
    let ok = 0; let fail = 0
    for (const id of ids) {
      try { await revokeCredential(id, reason); ok++ }
      catch { fail++ }
    }
    setBulkRevoking(false)
    if (ok)   toast(`${ok} credential${ok > 1 ? 's' : ''} revoked.`, 'success')
    if (fail) toast(`${fail} revocation${fail > 1 ? 's' : ''} failed.`, 'error')
    load()
  }

  const totalPages = Math.ceil(count / 20)

  return (
    <div style={{ maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--app-text)', margin: 0 }}>
            All Credentials
          </h1>
          <p style={{ fontSize: 13, marginTop: 4, color: 'var(--app-muted)' }}>{count} total</p>
        </div>
        <button onClick={handleExportCSV} disabled={exporting || loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700, border: '1px solid rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.08)', color: '#22C55E', cursor: 'pointer', opacity: (exporting || loading) ? 0.5 : 1 }}>
          <Download size={14} />{exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 380 }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--app-muted)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search name, license, institution…" value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
            style={{ ...INP, width: '100%', fontSize: 13, padding: '10px 14px 10px 38px', borderRadius: 12, boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = 'var(--clr-accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--app-card-bdr)'} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          style={{ ...INP, fontSize: 13, padding: '10px 12px', borderRadius: 12, cursor: 'pointer' }}>
          <option value="">All Statuses</option>
          {STATUS_OPTS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={load}
          style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--app-card-bdr)', background: 'var(--app-card)', color: 'var(--app-sub)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <RefreshCw size={15} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* table */}
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--app-card-bdr)' }}>
              <th style={{ padding: '10px 16px', width: 40 }}>
                <button onClick={toggleAll} disabled={activeRows.length === 0}
                  style={{ color: allSelected ? 'var(--clr-accent)' : 'var(--app-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', opacity: activeRows.length === 0 ? 0.3 : 1 }}>
                  {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
              {['Practitioner', 'Qualification', 'License No.', 'Expires', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--app-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--app-card-bdr)', borderTopColor: 'var(--clr-accent)', animation: 'spin 0.8s linear infinite' }} />
                </div>
              </td></tr>
            )}
            {!loading && data.length === 0 && (
              <tr><td colSpan={7}>
                <EmptyState
                  type={q || statusFilter ? 'search' : 'credentials'}
                  sub={q || statusFilter ? 'Try adjusting your search or filter.' : 'No credentials have been issued yet.'}
                />
              </td></tr>
            )}
            {!loading && data.map(c => {
              const isChecked = selected.has(c.credential_id)
              const canSelect = c.status === 'ACTIVE'
              return (
                <tr key={c.credential_id}
                  style={{ borderBottom: '1px solid var(--app-card-bdr)', background: isChecked ? 'rgba(0,212,168,0.05)' : '' }}
                  className={!isChecked ? 'hover-row' : ''}>
                  <td style={{ padding: '10px 16px' }}>
                    <button onClick={() => canSelect && toggleRow(c.credential_id)} disabled={!canSelect}
                      style={{ color: isChecked ? 'var(--clr-accent)' : 'var(--app-muted)', background: 'none', border: 'none', cursor: canSelect ? 'pointer' : 'default', display: 'flex', opacity: canSelect ? 1 : 0.2 }}>
                      {isChecked ? <CheckSquare size={15} /> : <Square size={15} />}
                    </button>
                  </td>
                  <td style={{ padding: '11px 18px', fontSize: 13, fontWeight: 600, color: 'var(--app-text)' }}>
                    <Link to={`/credentials/${c.credential_id}`} style={{ color: 'var(--app-text)', textDecoration: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                      {c.practitioner_name}
                    </Link>
                  </td>
                  <td style={{ padding: '11px 18px', fontSize: 13, color: 'var(--app-sub)' }}>{c.qualification}</td>
                  <td style={{ padding: '11px 18px', fontSize: 11, fontFamily: 'monospace', color: 'var(--app-muted)' }}>{c.license_number}</td>
                  <td style={{ padding: '11px 18px', fontSize: 13, color: 'var(--app-sub)' }}>{c.license_expiry_date}</td>
                  <td style={{ padding: '11px 18px' }}><StatusBadge status={c.status} /></td>
                  <td style={{ padding: '11px 18px' }}>
                    {c.status === 'ACTIVE' && (
                      <button onClick={() => handleRevoke(c.credential_id, c.practitioner_name)}
                        disabled={revoking === c.credential_id}
                        style={{ padding: '5px 12px', fontSize: 12, fontWeight: 700, borderRadius: 20, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#F87171', opacity: revoking === c.credential_id ? 0.5 : 1, transition: 'opacity 0.15s' }}>
                        {revoking === c.credential_id ? 'Revoking…' : 'Revoke'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--app-card-bdr)' }}>
            <span style={{ fontSize: 12, color: 'var(--app-muted)' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['Previous', page === 1, () => setPage(p => p - 1)],
                ['Next', page >= totalPages, () => setPage(p => p + 1)]].map(([label, dis, fn]) => (
                <button key={label} disabled={dis} onClick={fn}
                  style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid var(--app-card-bdr)', color: 'var(--app-sub)', background: 'var(--app-card)', cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.35 : 1 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* bulk action bar */}
      {someSelected && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, background: '#0B1527', border: '1px solid #1A2744',
          borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 320,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', marginRight: 4 }}>
            <span style={{ color: 'var(--clr-accent)' }}>{selected.size}</span> selected
          </span>
          <div style={{ height: 18, width: 1, background: '#1A2744' }} />
          <button onClick={handleBulkExport}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#22C55E', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 7 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <Download size={13} /> Export selected
          </button>
          <button onClick={() => setShowBulkModal(true)} disabled={bulkRevoking}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#F87171', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 7, opacity: bulkRevoking ? 0.5 : 1 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <XCircle size={13} />{bulkRevoking ? 'Revoking…' : 'Revoke selected'}
          </button>
          <div style={{ height: 18, width: 1, background: '#1A2744' }} />
          <button onClick={clearSelection}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, borderRadius: 6, display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = '#94A3B8'}
            onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {/* single revoke modal */}
      {singleTarget && (
        <RevokeReasonModal
          count={1}
          practitionerName={singleTarget.name}
          onConfirm={confirmSingleRevoke}
          onCancel={() => setSingleTarget(null)}
        />
      )}

      {/* bulk revoke modal */}
      {showBulkModal && (
        <RevokeReasonModal
          count={selected.size}
          onConfirm={confirmBulkRevoke}
          onCancel={() => setShowBulkModal(false)}
        />
      )}
    </div>
  )
}
