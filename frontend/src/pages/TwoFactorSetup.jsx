import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { twoFactorSetup, twoFactorConfirm } from '../api/auth'
import { useAuth } from '../context/AuthContext'

// ── OTP input ────────────────────────────────────────────────────────────────

function OtpInput({ onComplete, disabled }) {
  const [digits, setDigits] = useState(Array(6).fill(''))
  const refs = useRef([])

  const focus = i => refs.current[i]?.focus()

  const handleChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = digits.map((d, idx) => (idx === i ? digit : d))
    setDigits(next)
    if (digit && i < 5) focus(i + 1)
    if (next.every(d => d)) onComplete(next.join(''))
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        setDigits(d => d.map((v, idx) => (idx === i ? '' : v)))
      } else if (i > 0) {
        focus(i - 1)
        setDigits(d => d.map((v, idx) => (idx === i - 1 ? '' : v)))
      }
    }
  }

  const handlePaste = e => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = Array(6).fill('').map((_, i) => pasted[i] || '')
    setDigits(next)
    focus(Math.min(pasted.length, 5))
    if (pasted.length === 6) onComplete(pasted)
  }

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          autoFocus={i === 0}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-xl font-bold border-2 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     border-gray-300 dark:border-gray-600
                     focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200
                     disabled:opacity-50 transition"
        />
      ))}
    </div>
  )
}

// ── Backup codes screen ───────────────────────────────────────────────────────

function BackupCodesScreen({ codes, onDone }) {
  const [copied, setCopied]     = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const copyAll = () => {
    navigator.clipboard.writeText(codes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 max-w-md w-full">
      <div className="text-center mb-5">
        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Save Your Backup Codes</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          If you lose access to your authenticator app, these codes let you sign in.
          Each code can only be used <strong>once</strong>.
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-2">
          {codes.map((code, i) => (
            <div key={i} className="font-mono text-sm text-center py-2 px-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 select-all">
              {code}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={copyAll}
        className="w-full py-2 mb-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
      >
        {copied ? '✓ Copied!' : 'Copy all codes'}
      </button>

      <label className="flex items-start gap-3 mb-5 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          I have saved these backup codes in a safe place. I understand I cannot view them again.
        </span>
      </label>

      <button
        disabled={!confirmed}
        onClick={onDone}
        className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition"
      >
        Continue to Dashboard
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TwoFactorSetup() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const partialToken = location.state?.partial_token

  const [qrDataUrl, setQrDataUrl]     = useState(null)
  const [secret, setSecret]           = useState('')
  const [showSecret, setShowSecret]   = useState(false)
  const [loadError, setLoadError]     = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [verifying, setVerifying]     = useState(false)
  const [step, setStep]               = useState('loading') // loading | qr | backup | success | error
  const [backupCodes, setBackupCodes] = useState([])
  const [pendingUser, setPendingUser] = useState(null)

  useEffect(() => {
    if (!partialToken) {
      navigate('/login', { replace: true })
      return
    }
    twoFactorSetup(partialToken)
      .then(async r => {
        setSecret(r.data.secret)
        const dataUrl = await QRCode.toDataURL(r.data.otpauth_uri, { width: 240, margin: 1 })
        setQrDataUrl(dataUrl)
        setStep('qr')
      })
      .catch(err => {
        setLoadError(err.response?.data?.detail || 'Failed to start 2FA setup. Please log in again.')
        setStep('error')
      })
  }, [partialToken, navigate])

  const handleCode = async code => {
    setVerifyError('')
    setVerifying(true)
    try {
      const r = await twoFactorConfirm(partialToken, code)
      // Backend sets HttpOnly cookie; we receive backup_codes + user
      setPendingUser(r.data.user)
      setBackupCodes(r.data.backup_codes)
      setStep('backup')
    } catch (err) {
      setVerifyError(err.response?.data?.detail || 'Incorrect code. Try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleBackupDone = () => {
    signIn(null, pendingUser)
    navigate('/dashboard', { replace: true })
  }

  // ── Loading ──
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Error ──
  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Session Expired</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{loadError}</p>
          <button onClick={() => navigate('/login', { replace: true })}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition">
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  // ── Backup codes ──
  if (step === 'backup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-10">
        <BackupCodesScreen codes={backupCodes} onDone={handleBackupDone} />
      </div>
    )
  }

  // ── QR step ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-10">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 max-w-md w-full">

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Set Up Two-Factor Auth</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Required for all VerifyDoc Uganda accounts</p>
        </div>

        <div className="space-y-4 mb-6">
          <Step n={1} text="Install Google Authenticator or Authy on your phone" />
          <Step n={2} text="Scan the QR code below with your authenticator app" />
          <Step n={3} text="Enter the 6-digit code to confirm and activate" />
        </div>

        <div className="flex flex-col items-center mb-5">
          {qrDataUrl
            ? <div className="p-3 bg-white rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-sm">
                <img src={qrDataUrl} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            : <div className="w-48 h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          }
        </div>

        <div className="mb-6 text-center">
          <button type="button" onClick={() => setShowSecret(s => !s)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none">
            {showSecret ? 'Hide' : "Can't scan? Enter the code manually"}
          </button>
          {showSecret && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Manual entry key</p>
              <code className="text-sm font-mono text-gray-800 dark:text-gray-200 select-all break-all">{secret}</code>
            </div>
          )}
        </div>

        <div className="mb-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center mb-4">
            Enter the 6-digit code from your app
          </p>
          <OtpInput onComplete={handleCode} disabled={verifying} />
        </div>

        {verifyError && (
          <p className="text-sm text-red-600 dark:text-red-400 text-center mt-3">{verifyError}</p>
        )}
        {verifying && (
          <div className="flex justify-center mt-4">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className="text-center mt-6">
          <button onClick={() => navigate('/login', { replace: true })}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  )
}

function Step({ n, text }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</div>
      <p className="text-sm text-gray-700 dark:text-gray-300">{text}</p>
    </div>
  )
}
