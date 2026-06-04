import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Save, Lock, Mail, Building2, Phone, Shield, ChevronDown } from 'lucide-react'
import client from '../api/client'
import useDocumentTitle from '../hooks/useDocumentTitle'

const C = {
  card: { background: '#fff', border: '1px solid #E8EDF5', borderRadius: 16, boxShadow: '0 1px 3px rgba(15,23,42,0.05)' },
  acc:  '#00D4A8',
  text: '#0F172A',
  sub:  '#64748B',
  mut:  '#94A3B8',
}

const ROLE_META = {
  ADMIN:    { label: 'Administrator', bg: 'rgba(139,92,246,0.12)', text: '#7C3AED', border: 'rgba(139,92,246,0.2)',  grad: 'linear-gradient(135deg,#7C3AED,#6D28D9)' },
  ISSUER:   { label: 'Issuer',        bg: 'rgba(59,130,246,0.12)', text: '#2563EB', border: 'rgba(59,130,246,0.2)',  grad: 'linear-gradient(135deg,#2563EB,#1D4ED8)' },
  VERIFIER: { label: 'Verifier',      bg: 'rgba(0,212,168,0.12)',  text: '#0D9488', border: 'rgba(0,212,168,0.2)',   grad: 'linear-gradient(135deg,#00D4A8,#0D9488)' },
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <div style={{ width: 3, height: 14, background: C.acc, borderRadius: 2 }} />
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mut, margin: 0 }}>{children}</p>
    </div>
  )
}

function Field({ label, icon: Icon, error, children }) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>
        {Icon && <Icon size={13} style={{ color: C.mut }} />}{label}
      </label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

const inputStyle = (focused) => ({
  width: '100%', padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  background: '#F8FAFC', border: `1px solid ${focused ? C.acc : '#E8EDF5'}`, borderRadius: 10,
  color: C.text, transition: 'border-color 0.15s',
})

function FocusInput({ type = 'text', value, onChange, placeholder, required }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
      style={inputStyle(focused)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

export default function Profile() {
  useDocumentTitle('My Profile')
  const { user, signIn } = useAuth()
  const toast = useToast()

  const [form, setForm] = useState({
    email:          user?.email || '',
    institution_id: user?.institution_id || '',
    phone_number:   user?.phone_number || '',
  })
  const [institutions, setInstitutions] = useState([])
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [errors, setErrors]     = useState({})
  const [pwErrors, setPwErrors] = useState({})
  const [saving, setSaving]     = useState(false)
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    client.get('/institutions/').then(r => setInstitutions(r.data)).catch(() => {})
  }, [])

  const set = f => e => setForm(v => ({ ...v, [f]: e.target.value }))
  const setPw = f => e => setPwForm(v => ({ ...v, [f]: e.target.value }))

  const handleSave = async e => {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    try {
      const { data } = await client.patch('/auth/me/update/', form)
      signIn(localStorage.getItem('token'), data)
      toast('Profile updated successfully.', 'success')
    } catch (err) {
      setErrors(err.response?.data || { detail: 'Update failed.' })
    } finally {
      setSaving(false)
    }
  }

  const handlePassword = async e => {
    e.preventDefault()
    setPwErrors({})
    if (pwForm.new_password !== pwForm.confirm) {
      setPwErrors({ confirm: 'Passwords do not match.' })
      return
    }
    setChangingPw(true)
    try {
      const { data } = await client.patch('/auth/me/update/', {
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      })
      if (data.new_token) signIn(data.new_token, data)
      toast('Password changed successfully.', 'success')
      setPwForm({ old_password: '', new_password: '', confirm: '' })
    } catch (err) {
      setPwErrors(err.response?.data || { detail: 'Password change failed.' })
    } finally {
      setChangingPw(false)
    }
  }

  const role = user?.is_superuser ? 'ADMIN' : user?.role
  const rm   = ROLE_META[role] || ROLE_META.VERIFIER
  const initials = user?.username?.[0]?.toUpperCase() ?? '?'
  const joinDate = user?.date_joined
    ? new Date(user.date_joined).toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  return (
    <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* page header */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.mut, marginBottom: 4 }}>
          Account
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: C.text, margin: 0 }}>
          My Profile
        </h1>
        <p style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>Manage your account information and security</p>
      </div>

      {/* identity card */}
      <div style={{
        borderRadius: 16, padding: 24, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg,#0F2846,#0A1E38)',
        border: '1px solid #1A3A5C',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(0,212,168,0.06)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, flexShrink: 0,
            background: rm.grad,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 900, color: '#fff',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.01em' }}>{user?.username}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{user?.email}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: rm.bg, color: rm.text, border: `1px solid ${rm.border}`, letterSpacing: '0.05em' }}>
                {rm.label}
              </span>
              <span style={{ fontSize: 11, color: '#475569' }}>Joined {joinDate}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: 'rgba(0,212,168,0.1)', border: '1px solid rgba(0,212,168,0.15)', flexShrink: 0 }}>
            <Shield size={12} style={{ color: C.acc }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.acc }}>Active</span>
          </div>
        </div>
      </div>

      {/* profile info */}
      <div style={C.card}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9' }}>
          <SectionLabel>Profile information</SectionLabel>
        </div>
        <div style={{ padding: 20 }}>
          {errors.detail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#B91C1C', margin: 0 }}>{errors.detail}</p>
            </div>
          )}
          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Email Address" icon={Mail} error={errors.email}>
                <FocusInput type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
              </Field>
              <Field label="Institution" icon={Building2} error={errors.institution_id}>
                {institutions.length > 0 ? (
                  <div style={{ position: 'relative' }}>
                    <select
                      value={form.institution_id}
                      onChange={set('institution_id')}
                      style={{
                        width: '100%', padding: '10px 36px 10px 12px', fontSize: 13,
                        outline: 'none', appearance: 'none', cursor: 'pointer',
                        background: '#F8FAFC', border: '1px solid #E8EDF5', borderRadius: 10,
                        color: form.institution_id ? C.text : C.mut, transition: 'border-color 0.15s',
                      }}
                      onFocus={e => e.target.style.borderColor = C.acc}
                      onBlur={e => e.target.style.borderColor = '#E8EDF5'}>
                      <option value="">— Select institution —</option>
                      {institutions.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.mut, pointerEvents: 'none' }} />
                  </div>
                ) : (
                  <div style={{ padding: '10px 12px', fontSize: 13, background: '#F8FAFC', border: '1px solid #E8EDF5', borderRadius: 10, color: C.mut }}>
                    {user?.institution_name || 'No institution linked'}
                  </div>
                )}
              </Field>
              <Field label="Phone Number" icon={Phone}>
                <FocusInput type="tel" value={form.phone_number} onChange={set('phone_number')} placeholder="+256 700 000 000" />
              </Field>
            </div>
            <div style={{ marginTop: 20 }}>
              <button type="submit" disabled={saving} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '10px 18px', borderRadius: 20, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? '#E2E8F0' : C.acc, color: saving ? C.mut : '#06101F',
                fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
              }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#00BFA0' }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = C.acc }}>
                <Save size={14} />{saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* change password */}
      <div style={C.card}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9' }}>
          <SectionLabel>Change password</SectionLabel>
        </div>
        <div style={{ padding: 20 }}>
          {pwErrors.detail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#B91C1C', margin: 0 }}>{pwErrors.detail}</p>
            </div>
          )}
          <form onSubmit={handlePassword}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Current Password" icon={Lock} error={pwErrors.old_password}>
                <FocusInput type="password" value={pwForm.old_password} onChange={setPw('old_password')} required />
              </Field>
              <Field label="New Password" icon={Lock} error={pwErrors.new_password}>
                <FocusInput type="password" value={pwForm.new_password} onChange={setPw('new_password')} placeholder="Min 8 characters" required />
              </Field>
              <Field label="Confirm New Password" icon={Lock} error={pwErrors.confirm}>
                <FocusInput type="password" value={pwForm.confirm} onChange={setPw('confirm')} required />
              </Field>
            </div>
            <div style={{ marginTop: 20 }}>
              <button type="submit" disabled={changingPw} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '10px 18px', borderRadius: 20, border: 'none', cursor: changingPw ? 'not-allowed' : 'pointer',
                background: changingPw ? '#E2E8F0' : '#0F172A', color: changingPw ? C.mut : '#F1F5F9',
                fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
              }}
                onMouseEnter={e => { if (!changingPw) e.currentTarget.style.background = '#1E293B' }}
                onMouseLeave={e => { if (!changingPw) e.currentTarget.style.background = '#0F172A' }}>
                <Lock size={14} />{changingPw ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
