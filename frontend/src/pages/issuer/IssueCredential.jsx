import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCredential } from '../../api/credentials'
import { useToast } from '../../context/ToastContext'
import { CheckCircle, User, GraduationCap, FileText, Upload, Camera, Blocks } from 'lucide-react'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import WebcamCapture from '../../components/WebcamCapture'

const C = {
  card: { background: '#fff', border: '1px solid #E8EDF5', borderRadius: 16, boxShadow: '0 1px 3px rgba(15,23,42,0.05)' },
  acc:  '#00D4A8',
  text: '#0F172A',
  sub:  '#64748B',
  mut:  '#94A3B8',
}

const QUALIFICATIONS  = ['MBChB', 'BDS', 'BPharm', 'BNSc', 'MMed', 'MBBCh', 'Other']
const SPECIALIZATIONS = [
  'General Practice', 'Surgery', 'Paediatrics', 'Obstetrics & Gynaecology',
  'Internal Medicine', 'Psychiatry', 'Radiology', 'Dentistry', 'Pharmacy', 'Nursing', 'Other',
]
const YEAR_RANGE = Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - i)

function validate(form) {
  const errs = {}
  if (!form.practitioner_name.trim()) errs.practitioner_name = 'Full name is required.'
  if (!form.practitioner_id.trim()) errs.practitioner_id = 'National ID / Passport is required.'
  if (!form.qualification) errs.qualification = 'Please select a qualification.'
  if (!form.institution_of_study.trim()) errs.institution_of_study = 'Institution of study is required.'
  if (!form.year_of_graduation) errs.year_of_graduation = 'Please select graduation year.'
  if (!form.license_number.trim()) errs.license_number = 'License number is required.'
  if (!form.license_expiry_date) {
    errs.license_expiry_date = 'Expiry date is required.'
  } else if (form.license_expiry_date <= new Date().toISOString().split('T')[0]) {
    errs.license_expiry_date = 'Expiry date must be in the future.'
  }
  return errs
}

function SectionCard({ icon: Icon, title, colour = C.acc, children }) {
  return (
    <div style={C.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(0,212,168,0.08)', border: '1px solid rgba(0,212,168,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} style={{ color: colour }} />
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mut, margin: 0 }}>{title}</p>
      </div>
      <div style={{ padding: 20 }}>
        {children}
      </div>
    </div>
  )
}

function InputField({ label, required, error, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text', required }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
      style={{
        width: '100%', padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
        background: '#F8FAFC', border: `1px solid ${focused ? C.acc : '#E8EDF5'}`, borderRadius: 10,
        color: C.text, transition: 'border-color 0.15s',
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function SelectInput({ value, onChange, children, required }) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      value={value} onChange={onChange} required={required}
      style={{
        width: '100%', padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
        background: '#F8FAFC', border: `1px solid ${focused ? C.acc : '#E8EDF5'}`, borderRadius: 10,
        color: value ? C.text : C.mut, transition: 'border-color 0.15s', appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </select>
  )
}

export default function IssueCredential() {
  useDocumentTitle('Issue Credential')
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState({
    practitioner_name: '',
    practitioner_id: '',
    date_of_birth: '',
    qualification: '',
    specialization: '',
    institution_of_study: '',
    year_of_graduation: '',
    license_number: '',
    license_expiry_date: '',
  })
  const [files, setFiles]         = useState({ credential_document: null, practitioner_photo: null })
  const [webcamPhoto, setWebcamPhoto] = useState(null)
  const [errors, setErrors]       = useState({})
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(null)

  const set = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    const clientErrors = validate(form)
    if (Object.keys(clientErrors).length > 0) { setErrors(clientErrors); return }
    setErrors({})
    setLoading(true)

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v))
    if (files.credential_document) fd.append('credential_document', files.credential_document)
    if (files.practitioner_photo) {
      fd.append('practitioner_photo', files.practitioner_photo)
    } else if (webcamPhoto) {
      fd.append('webcam_photo_data', webcamPhoto)
    }

    try {
      const { data } = await createCredential(fd)
      toast(`Credential issued for ${data.practitioner_name}.`, 'success')
      setSuccess(data)
    } catch (err) {
      const serverErrors = err.response?.data || { detail: 'Failed to issue credential.' }
      setErrors(serverErrors)
      toast(serverErrors.detail || 'Submission failed. Please check the form.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ ...C.card, padding: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={30} style={{ color: '#16A34A' }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>Credential Issued</h2>
          <p style={{ fontSize: 14, color: C.sub, margin: '0 0 4px' }}>
            <strong style={{ color: C.text }}>{success.practitioner_name}</strong> — {success.qualification}
          </p>
          <p style={{ fontSize: 12, fontFamily: 'monospace', color: C.mut, margin: '0 0 16px' }}>{success.license_number}</p>
          {success.blockchain_recorded && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: 'rgba(0,212,168,0.08)', border: '1px solid rgba(0,212,168,0.2)', marginBottom: 24 }}>
              <Blocks size={13} style={{ color: C.acc }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.acc }}>Recorded on Ethereum</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => { setSuccess(null); setForm(f => Object.fromEntries(Object.keys(f).map(k => [k, '']))); setFiles({ credential_document: null, practitioner_photo: null }); setWebcamPhoto(null) }}
              style={{ padding: '10px 20px', borderRadius: 20, border: 'none', background: C.acc, color: '#06101F', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Issue Another
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ padding: '10px 20px', borderRadius: 20, border: '1px solid #E8EDF5', background: '#F8FAFC', color: C.sub, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 780, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.mut, marginBottom: 4 }}>
            Issuer Portal
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: C.text, margin: 0 }}>
            Register Credential
          </h1>
          <p style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>Issue a new medical practitioner credential on the blockchain</p>
        </div>
      </div>

      {errors.detail && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <p style={{ fontSize: 13, color: '#B91C1C', margin: 0 }}>{errors.detail}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* practitioner details */}
        <SectionCard icon={User} title="Practitioner Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <InputField label="Full Name" required error={errors.practitioner_name}>
              <TextInput value={form.practitioner_name} onChange={set('practitioner_name')} placeholder="Dr. Jane Nakato" required />
            </InputField>
            <InputField label="National ID / Passport" required error={errors.practitioner_id}>
              <TextInput value={form.practitioner_id} onChange={set('practitioner_id')} placeholder="CM 123456" required />
            </InputField>
            <InputField label="Date of Birth">
              <TextInput type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
            </InputField>
            <InputField label="Practitioner Photo">
              {!webcamPhoto ? (
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
                  background: '#F8FAFC', border: '1px solid #E8EDF5', borderRadius: 10, cursor: 'pointer',
                }}>
                  <Upload size={14} style={{ color: C.mut }} />
                  <span style={{ fontSize: 13, color: files.practitioner_photo ? C.text : C.mut }}>
                    {files.practitioner_photo ? files.practitioner_photo.name : 'Upload photo…'}
                  </span>
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => setFiles(f => ({ ...f, practitioner_photo: e.target.files[0] }))} />
                </label>
              ) : null}
              {!files.practitioner_photo && (
                <div style={{ marginTop: webcamPhoto ? 0 : 8 }}>
                  {!webcamPhoto && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ flex: 1, height: 1, background: '#E8EDF5' }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.mut, textTransform: 'uppercase', letterSpacing: '0.06em' }}>or</span>
                      <div style={{ flex: 1, height: 1, background: '#E8EDF5' }} />
                    </div>
                  )}
                  <WebcamCapture
                    captured={webcamPhoto}
                    onCapture={b64 => setWebcamPhoto(b64)}
                    onClear={() => setWebcamPhoto(null)}
                  />
                </div>
              )}
            </InputField>
          </div>
        </SectionCard>

        {/* qualification */}
        <SectionCard icon={GraduationCap} title="Qualification">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <InputField label="Qualification" required error={errors.qualification}>
              <SelectInput value={form.qualification} onChange={set('qualification')} required>
                <option value="">Select…</option>
                {QUALIFICATIONS.map(q => <option key={q}>{q}</option>)}
              </SelectInput>
            </InputField>
            <InputField label="Specialization">
              <SelectInput value={form.specialization} onChange={set('specialization')}>
                <option value="">None / General</option>
                {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
              </SelectInput>
            </InputField>
            <InputField label="Institution of Study" required error={errors.institution_of_study}>
              <TextInput value={form.institution_of_study} onChange={set('institution_of_study')} placeholder="Makerere University" required />
            </InputField>
            <InputField label="Year of Graduation" required error={errors.year_of_graduation}>
              <SelectInput value={form.year_of_graduation} onChange={set('year_of_graduation')} required>
                <option value="">Select year…</option>
                {YEAR_RANGE.map(y => <option key={y}>{y}</option>)}
              </SelectInput>
            </InputField>
          </div>
        </SectionCard>

        {/* license */}
        <SectionCard icon={FileText} title="License Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <InputField label="UMDPC License Number" required error={errors.license_number}>
              <TextInput value={form.license_number} onChange={set('license_number')} placeholder="UMDPC/2024/12345" required />
            </InputField>
            <InputField label="License Expiry Date" required error={errors.license_expiry_date}>
              <TextInput type="date" value={form.license_expiry_date} onChange={set('license_expiry_date')} required />
            </InputField>
            <InputField label="Credential Document (PDF/Image)">
              <label style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
                background: '#F8FAFC', border: '1px solid #E8EDF5', borderRadius: 10, cursor: 'pointer',
              }}>
                <Camera size={14} style={{ color: C.mut }} />
                <span style={{ fontSize: 13, color: files.credential_document ? C.text : C.mut }}>
                  {files.credential_document ? files.credential_document.name : 'Upload document…'}
                </span>
                <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }}
                  onChange={e => setFiles(f => ({ ...f, credential_document: e.target.files[0] }))} />
              </label>
            </InputField>
          </div>
        </SectionCard>

        {/* submit */}
        <div style={{ display: 'flex', gap: 10, paddingBottom: 8 }}>
          <button type="submit" disabled={loading} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '11px 22px', borderRadius: 20, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? '#E2E8F0' : C.acc,
            color: loading ? C.mut : '#06101F',
            fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
          }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#00BFA0' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = loading ? '#E2E8F0' : C.acc }}>
            {loading
              ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #94A3B8', borderTopColor: '#475569', animation: 'spin 0.7s linear infinite' }} />Issuing…</>
              : <><Blocks size={14} />Issue Credential</>
            }
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} style={{
            padding: '11px 22px', borderRadius: 20, border: '1px solid #E8EDF5',
            background: '#F8FAFC', color: C.sub, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#CBD5E1' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E8EDF5' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
