import { useEffect, useState, useCallback } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { getAuditLog } from '../../api/admin'
import EmptyState from '../../components/EmptyState'
import useDocumentTitle from '../../hooks/useDocumentTitle'

const ACC = 'var(--clr-accent)'

const ACTION_OPTS = [
  '', 'CREDENTIAL_ISSUED', 'CREDENTIAL_REVOKED', 'CREDENTIAL_RENEWED',
  'CREDENTIAL_VERIFIED', 'USER_APPROVED', 'USER_REJECTED', 'USER_REGISTERED',
]

const CARD = { background: 'var(--app-card)', border: '1px solid var(--app-card-bdr)', borderRadius: 16 }
const INP  = { background: 'var(--app-input)', border: '1px solid var(--app-card-bdr)', color: 'var(--app-text)', outline: 'none', transition: 'border-color 0.15s' }

export default function AuditLog() {
  useDocumentTitle('Audit Log')
  const [data, setData]       = useState([])
  const [count, setCount]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)

  const [actor, setActor]       = useState('')
  const [action, setAction]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const hasFilters = actor || action || dateFrom || dateTo

  const load = useCallback(() => {
    setLoading(true)
    const params = { page }
    if (actor.trim())  params.actor    = actor.trim()
    if (action)        params.action   = action
    if (dateFrom)      params.date_from = dateFrom
    if (dateTo)        params.date_to   = dateTo
    getAuditLog(page, params)
      .then(r => { setData(r.data.results); setCount(r.data.count) })
      .finally(() => setLoading(false))
  }, [page, actor, action, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  const clearFilters = () => { setActor(''); setAction(''); setDateFrom(''); setDateTo(''); setPage(1) }

  const fmt = iso => new Date(iso).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div style={{ maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--app-text)', margin: 0 }}>
          Audit Log
        </h1>
        <p style={{ fontSize: 13, marginTop: 4, color: 'var(--app-muted)' }}>{count} total entries</p>
      </div>

      {/* filters */}
      <div style={{ ...CARD, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Filter size={13} style={{ color: 'var(--app-muted)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--app-muted)' }}>
            Filters
          </span>
          {hasFilters && (
            <button onClick={clearFilters}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--app-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={12} />Clear
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--app-muted)', pointerEvents: 'none' }} />
            <input type="text" placeholder="Actor / username" value={actor}
              onChange={e => { setActor(e.target.value); setPage(1) }}
              style={{ ...INP, width: '100%', fontSize: 13, padding: '10px 12px 10px 34px', borderRadius: 12, boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = 'var(--clr-accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--app-card-bdr)'} />
          </div>
          <select value={action} onChange={e => { setAction(e.target.value); setPage(1) }}
            style={{ ...INP, fontSize: 13, padding: '10px 12px', borderRadius: 12, cursor: 'pointer' }}>
            <option value="">All Actions</option>
            {ACTION_OPTS.filter(Boolean).map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            style={{ ...INP, fontSize: 13, padding: '10px 12px', borderRadius: 12 }}
            onFocus={e => e.target.style.borderColor = 'var(--clr-accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--app-card-bdr)'} />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
            style={{ ...INP, fontSize: 13, padding: '10px 12px', borderRadius: 12 }}
            onFocus={e => e.target.style.borderColor = 'var(--clr-accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--app-card-bdr)'} />
        </div>
      </div>

      {/* table */}
      <div style={{ ...CARD, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 192 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--app-card-bdr)', borderTopColor: 'var(--clr-accent)', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : data.length === 0 ? (
          <EmptyState type="audit" sub={hasFilters ? 'No entries match the current filters.' : undefined} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--app-card-bdr)' }}>
                {['Time', 'Actor', 'Action', 'Target', 'Notes'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--app-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(e => (
                <tr key={e.id}
                  style={{ borderBottom: '1px solid var(--app-card-bdr)' }}
                  className="hover-row">
                  <td style={{ padding: '11px 20px', fontSize: 12, whiteSpace: 'nowrap', color: 'var(--app-muted)' }}>{fmt(e.timestamp)}</td>
                  <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: 600, color: 'var(--app-text)' }}>{e.actor}</td>
                  <td style={{ padding: '11px 20px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(74,158,255,0.12)', color: '#60A5FA' }}>
                      {e.action_display}
                    </span>
                  </td>
                  <td style={{ padding: '11px 20px', fontSize: 13, color: 'var(--app-sub)' }}>{e.target_description || '—'}</td>
                  <td style={{ padding: '11px 20px', fontSize: 12, color: 'var(--app-muted)' }}>{e.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {count > 20 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--app-card-bdr)' }}>
            <span style={{ fontSize: 12, color: 'var(--app-muted)' }}>Page {page} of {Math.ceil(count / 20)}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['Previous', page === 1, () => setPage(p => p - 1)],
                ['Next', page >= Math.ceil(count / 20), () => setPage(p => p + 1)]].map(([label, dis, fn]) => (
                <button key={label} disabled={dis} onClick={fn}
                  style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid var(--app-card-bdr)', color: 'var(--app-sub)', background: 'var(--app-card)', cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.35 : 1 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
