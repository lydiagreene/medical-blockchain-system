import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Building2, Mail, Phone, MapPin, Edit2, X, ChevronLeft, ChevronRight, ToggleLeft } from 'lucide-react'
import { getInstitutions, createInstitution, updateInstitution, deactivateInstitution } from '../../api/admin'
import { useToast } from '../../context/ToastContext'
import EmptyState from '../../components/EmptyState'
import useDocumentTitle from '../../hooks/useDocumentTitle'

const ACC = '#00D4A8'

const TYPE_LABELS = {
  UNIVERSITY:    'Medical University',
  HOSPITAL:      'Hospital',
  CLINIC:        'Clinic',
  LICENSING_BODY: 'Licensing Body',
}

const TYPE_COLORS = {
  UNIVERSITY:    { bg: 'rgba(59,130,246,0.1)',  text: '#3B82F6' },
  HOSPITAL:      { bg: 'rgba(0,212,168,0.1)',   text: '#00D4A8' },
  CLINIC:        { bg: 'rgba(168,85,247,0.1)',  text: '#A855F7' },
  LICENSING_BODY:{ bg: 'rgba(249,115,22,0.1)',  text: '#F97316' },
}

const BLANK = {
  name: '', institution_type: 'HOSPITAL', address: '',
  contact_email: '', contact_phone: '', wallet_address: '', is_active: true,
}

function Modal({ title, onClose, onSubmit, submitting, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" style={{ border: '1px solid #E2E8F0' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <h2 className="font-extrabold text-base" style={{ color: '#0F172A' }}>{title}</h2>
          <button onClick={onClose} style={{ color: '#94A3B8' }}><X size={18} /></button>
        </div>
        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          {children}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: ACC, color: '#060D1F' }}>
              {submitting ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#F1F5F9', color: '#64748B' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5"
        style={{ color: '#94A3B8' }}>{label}</label>
      {children}
    </div>
  )
}

const inputCls = {
  width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
  background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A', outline: 'none',
}

export default function Institutions() {
  useDocumentTitle('Institutions')
  const toast = useToast()
  const [rows, setRows]       = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [q, setQ]             = useState('')
  const [loading, setLoading] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm]       = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async (pg = 1, query = '') => {
    setLoading(true)
    try {
      const { data } = await getInstitutions(pg, query)
      setRows(data.results)
      setTotal(data.count)
    } catch {
      toast('Failed to load institutions.', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load(page, q) }, [page, q, load])

  const openCreate = () => { setForm(BLANK); setShowCreate(true) }
  const openEdit   = inst => { setForm({ ...inst }); setEditTarget(inst) }
  const closeModal = () => { setShowCreate(false); setEditTarget(null) }

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editTarget) {
        const { data } = await updateInstitution(editTarget.id, form)
        setRows(r => r.map(i => i.id === data.id ? data : i))
        toast('Institution updated.', 'success')
      } else {
        const { data } = await createInstitution(form)
        setRows(r => [data, ...r])
        setTotal(t => t + 1)
        toast('Institution created.', 'success')
      }
      closeModal()
    } catch (err) {
      const msg = err.response?.data
      toast(typeof msg === 'string' ? msg : Object.values(msg || {})[0] || 'Save failed.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeactivate = async inst => {
    if (!confirm(`Deactivate "${inst.name}"?`)) return
    try {
      await deactivateInstitution(inst.id)
      setRows(r => r.map(i => i.id === inst.id ? { ...i, is_active: false } : i))
      toast(`${inst.name} deactivated.`, 'success')
    } catch {
      toast('Deactivation failed.', 'error')
    }
  }

  const totalPages = Math.ceil(total / 20)

  const fieldSet = (key) => e => setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: '#0F172A' }}>Institutions</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>{total} registered institution{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: ACC, color: '#060D1F' }}>
          <Plus size={15} />New Institution
        </button>
      </div>

      {/* search */}
      <div className="relative" style={{ maxWidth: 360 }}>
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
        <input
          type="text" placeholder="Search by name…" value={q}
          onChange={e => { setQ(e.target.value); setPage(1) }}
          className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none transition-colors"
          style={{ background: '#fff', border: '1px solid #E2E8F0', color: '#0F172A' }}
          onFocus={e => e.target.style.borderColor = ACC}
          onBlur={e => e.target.style.borderColor = '#E2E8F0'}
        />
      </div>

      {/* table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-[3px] rounded-full animate-spin" style={{ borderColor: '#E2E8F0', borderTopColor: ACC }} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            type="institutions"
            sub={q ? 'No institutions match your search.' : undefined}
            action={!q ? openCreate : undefined}
            actionLabel="New Institution"
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                {['Institution', 'Type', 'Contact', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em]"
                    style={{ color: '#94A3B8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(inst => {
                const tc = TYPE_COLORS[inst.institution_type] || TYPE_COLORS.HOSPITAL
                return (
                  <tr key={inst.id} style={{ borderBottom: '1px solid #F8FAFC' }}
                    className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: tc.bg }}>
                          <Building2 size={14} style={{ color: tc.text }} />
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: '#0F172A' }}>{inst.name}</p>
                          {inst.address && (
                            <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#94A3B8' }}>
                              <MapPin size={10} />{inst.address.slice(0, 40)}{inst.address.length > 40 ? '…' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                        style={{ background: tc.bg, color: tc.text }}>
                        {TYPE_LABELS[inst.institution_type]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        {inst.contact_email && (
                          <p className="text-xs flex items-center gap-1.5" style={{ color: '#64748B' }}>
                            <Mail size={11} />{inst.contact_email}
                          </p>
                        )}
                        {inst.contact_phone && (
                          <p className="text-xs flex items-center gap-1.5" style={{ color: '#64748B' }}>
                            <Phone size={11} />{inst.contact_phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {inst.is_active
                        ? <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(34,197,94,0.1)', color: '#15803D' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active
                          </span>
                        : <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(148,163,184,0.15)', color: '#64748B' }}>
                            Inactive
                          </span>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(inst)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-slate-100"
                          title="Edit" style={{ color: '#64748B' }}>
                          <Edit2 size={14} />
                        </button>
                        {inst.is_active && (
                          <button onClick={() => handleDeactivate(inst)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                            title="Deactivate" style={{ color: '#94A3B8' }}>
                            <ToggleLeft size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: '#94A3B8' }}>
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-xl disabled:opacity-40 transition-colors hover:bg-slate-100"
              style={{ border: '1px solid #E2E8F0', color: '#64748B' }}>
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-xl disabled:opacity-40 transition-colors hover:bg-slate-100"
              style={{ border: '1px solid #E2E8F0', color: '#64748B' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {(showCreate || editTarget) && (
        <Modal
          title={editTarget ? 'Edit Institution' : 'New Institution'}
          onClose={closeModal}
          onSubmit={handleSubmit}
          submitting={submitting}>
          <Field label="Institution Name">
            <input required type="text" style={inputCls} value={form.name}
              onChange={fieldSet('name')} placeholder="e.g. Makerere University College of Health Sciences"
              onFocus={e => e.target.style.borderColor = ACC} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
          </Field>
          <Field label="Type">
            <select required style={inputCls} value={form.institution_type} onChange={fieldSet('institution_type')}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Email">
              <input required type="email" style={inputCls} value={form.contact_email}
                onChange={fieldSet('contact_email')} placeholder="admin@institution.ug"
                onFocus={e => e.target.style.borderColor = ACC} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
            </Field>
            <Field label="Contact Phone">
              <input type="tel" style={inputCls} value={form.contact_phone || ''}
                onChange={fieldSet('contact_phone')} placeholder="+256 700 000 000"
                onFocus={e => e.target.style.borderColor = ACC} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
            </Field>
          </div>
          <Field label="Address">
            <input type="text" style={inputCls} value={form.address || ''}
              onChange={fieldSet('address')} placeholder="City, District, Uganda"
              onFocus={e => e.target.style.borderColor = ACC} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
          </Field>
          <Field label="Ethereum Wallet Address (optional)">
            <input type="text" style={inputCls} value={form.wallet_address || ''}
              onChange={fieldSet('wallet_address')} placeholder="0x..."
              onFocus={e => e.target.style.borderColor = ACC} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
          </Field>
        </Modal>
      )}
    </div>
  )
}
