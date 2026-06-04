import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, PlusCircle } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import { listCredentials } from '../../api/credentials'
import useDocumentTitle from '../../hooks/useDocumentTitle'

export default function IssuerCredentials() {
  useDocumentTitle('My Credentials')
  const navigate              = useNavigate()
  const [data, setData]       = useState([])
  const [count, setCount]     = useState(0)
  const [q, setQ]             = useState('')
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page }
      if (q.trim()) params.q = q.trim()
      const { data: res } = await listCredentials(params)
      setData(res.results ?? res)
      setCount(res.count ?? (res.results ?? res).length)
    } finally { setLoading(false) }
  }, [q, page])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5 max-w-5xl">
      {/* header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#0F172A' }}>My Credentials</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>{count} total</p>
        </div>
        <Link to="/issuer/issue"
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:opacity-90"
          style={{ background: '#00D4A8', color: '#060D1F' }}>
          <PlusCircle size={15} />Issue New
        </Link>
      </div>

      {/* search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
        <input type="text" placeholder="Search by name or license…" value={q}
          onChange={e => { setQ(e.target.value); setPage(1) }}
          className="w-full text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none transition-colors"
          style={{ background: '#fff', border: '1px solid #E2E8F0', color: '#0F172A' }}
          onFocus={e => e.target.style.borderColor = '#00D4A8'}
          onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
      </div>

      {/* table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
              {['Practitioner','Qualification','License No.','Expires','Status'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em]"
                  style={{ color: '#94A3B8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-sm" style={{ color: '#94A3B8' }}>Loading…</td></tr>
            )}
            {!loading && data.length === 0 && (
              <tr><td colSpan={5}>
                <EmptyState
                  type={q ? 'search' : 'credentials'}
                  sub={q ? 'No credentials match your search.' : "You haven't issued any credentials yet."}
                  action={!q ? () => navigate('/issuer/issue') : undefined}
                  actionLabel="Issue First Credential"
                />
              </td></tr>
            )}
            {!loading && data.map(c => (
              <tr key={c.credential_id} style={{ borderBottom: '1px solid #F8FAFC' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td className="px-5 py-3 text-sm font-semibold" style={{ color: '#0F172A' }}>
                  <Link to={`/credentials/${c.credential_id}`} className="hover:underline" style={{ color: '#0F172A' }}>
                    {c.practitioner_name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-sm" style={{ color: '#64748B' }}>{c.qualification}</td>
                <td className="px-5 py-3 text-xs font-mono" style={{ color: '#94A3B8' }}>{c.license_number}</td>
                <td className="px-5 py-3 text-sm" style={{ color: '#64748B' }}>{c.license_expiry_date}</td>
                <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {count > 20 && (
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #F1F5F9' }}>
            <span className="text-xs" style={{ color: '#94A3B8' }}>Page {page} of {Math.ceil(count / 20)}</span>
            <div className="flex gap-2">
              {[['Previous', page === 1, () => setPage(p => p - 1)],
                ['Next', page >= Math.ceil(count / 20), () => setPage(p => p + 1)]].map(([label, disabled, fn]) => (
                <button key={label} disabled={disabled} onClick={fn}
                  className="px-4 py-1.5 rounded-full text-xs font-bold transition-colors disabled:opacity-30"
                  style={{ border: '1px solid #E2E8F0', color: '#64748B', background: '#fff' }}>
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
