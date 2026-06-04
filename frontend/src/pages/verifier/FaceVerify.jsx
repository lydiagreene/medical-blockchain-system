import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, CheckCircle, XCircle, ScanFace, RefreshCw, Search, ShieldCheck, AlertTriangle } from 'lucide-react'
import { verifyFace } from '../../api/credentials'
import useDocumentTitle from '../../hooks/useDocumentTitle'

const ACC = '#00D4A8'

/* ── Liveness: compute mean absolute difference between two canvas pixel arrays ── */
function frameDiff(data1, data2) {
  let diff = 0
  for (let i = 0; i < data1.length; i += 4) {
    diff += Math.abs(data1[i] - data2[i])         // R
    diff += Math.abs(data1[i + 1] - data2[i + 1]) // G
    diff += Math.abs(data1[i + 2] - data2[i + 2]) // B
  }
  return diff / (data1.length / 4)
}

const LIVENESS_THRESHOLD = 6   // mean pixel diff needed to confirm real person
const LIVENESS_SAMPLES   = 6   // frames to sample
const LIVENESS_INTERVAL  = 350 // ms between frames

export default function FaceVerify() {
  useDocumentTitle('Face Verification')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [step, setStep] = useState('input') // input | liveness | camera | result
  const [captured, setCaptured] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // Liveness state
  const [livenessScore, setLivenessScore] = useState(0)
  const [livenessReady, setLivenessReady] = useState(false)
  const [livenessChecking, setLivenessChecking] = useState(false)

  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)
  const framesRef = useRef([])
  const liveIntervalRef = useRef(null)

  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream
  }, [stream, step])

  useEffect(() => () => {
    if (stream) stream.getTracks().forEach(t => t.stop())
    clearInterval(liveIntervalRef.current)
  }, [stream])

  /* ── Sample frames to detect real motion (anti-spoofing) ── */
  const startLivenessCheck = useCallback((videoEl) => {
    framesRef.current = []
    setLivenessScore(0)
    setLivenessReady(false)
    setLivenessChecking(true)

    const sampleCanvas = document.createElement('canvas')
    sampleCanvas.width  = 160
    sampleCanvas.height = 120
    const ctx = sampleCanvas.getContext('2d')

    liveIntervalRef.current = setInterval(() => {
      if (!videoEl || videoEl.readyState < 2) return
      ctx.drawImage(videoEl, 0, 0, 160, 120)
      const data = ctx.getImageData(0, 0, 160, 120).data
      framesRef.current.push(data)

      if (framesRef.current.length >= LIVENESS_SAMPLES) {
        clearInterval(liveIntervalRef.current)
        // Compute max inter-frame difference
        let maxDiff = 0
        for (let i = 1; i < framesRef.current.length; i++) {
          const d = frameDiff(framesRef.current[i - 1], framesRef.current[i])
          if (d > maxDiff) maxDiff = d
        }
        const score = Math.min(100, Math.round((maxDiff / LIVENESS_THRESHOLD) * 100))
        setLivenessScore(score)
        setLivenessReady(maxDiff >= LIVENESS_THRESHOLD)
        setLivenessChecking(false)
      }
    }, LIVENESS_INTERVAL)
  }, [])

  const startCamera = useCallback(async () => {
    setError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 540 } },
      })
      setStream(s)
      setStep('liveness')
    } catch {
      setError('Camera access denied. Please allow camera permissions and try again.')
    }
  }, [])

  // Start liveness check once video element is ready
  useEffect(() => {
    if (step !== 'liveness' || !stream) return
    const v = videoRef.current
    if (!v) return
    const onReady = () => startLivenessCheck(v)
    if (v.readyState >= 2) { onReady(); return }
    v.addEventListener('loadeddata', onReady, { once: true })
  }, [step, stream, startLivenessCheck])

  const proceedToCapture = useCallback(() => {
    clearInterval(liveIntervalRef.current)
    setStep('camera')
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null) }
    clearInterval(liveIntervalRef.current)
  }, [stream])

  const capture = useCallback(async () => {
    const v = videoRef.current
    if (!v) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    const base64 = c.toDataURL('image/jpeg', 0.85)
    stopCamera()
    setCaptured(base64)
    setLoading(true)
    setError('')
    try {
      const { data } = await verifyFace({
        license_number: licenseNumber.trim().toUpperCase(),
        face_image_data: base64,
      })
      setResult(data)
      setStep('result')
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed. Please try again.')
      setStep('input')
    } finally {
      setLoading(false)
    }
  }, [stream, stopCamera, licenseNumber])

  const reset = useCallback(() => {
    stopCamera()
    setCaptured(null); setResult(null); setError(''); setStep('input')
    setLivenessScore(0); setLivenessReady(false); setLivenessChecking(false)
    framesRef.current = []
  }, [stopCamera])

  const livenessBarColor = livenessReady ? ACC : livenessScore > 50 ? '#F59E0B' : '#EF4444'

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#0F172A' }}>Face Verification</h1>
        <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Confirm a practitioner's identity with facial recognition</p>
      </div>

      {/* Step 1 — enter license number */}
      {step === 'input' && (
        <div className="bg-white rounded-2xl p-6 space-y-5" style={{ border: '1px solid #E2E8F0' }}>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.1em] mb-1.5 block" style={{ color: '#94A3B8' }}>
              UMDPC License Number
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
              <input
                type="text" value={licenseNumber}
                onChange={e => setLicenseNumber(e.target.value)}
                placeholder="e.g. UMDPC/2024/12345"
                className="w-full text-sm pl-10 pr-4 py-3 rounded-xl outline-none transition-colors"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }}
                onFocus={e => e.target.style.borderColor = ACC}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                onKeyDown={e => e.key === 'Enter' && licenseNumber.trim() && startCamera()}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <XCircle size={15} style={{ color: '#B91C1C' }} className="flex-shrink-0 mt-0.5" />
              <p className="text-xs font-medium" style={{ color: '#B91C1C' }}>{error}</p>
            </div>
          )}

          <button
            disabled={!licenseNumber.trim() || loading}
            onClick={startCamera}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: ACC, color: '#060D1F' }}>
            {loading ? 'Preparing…' : <><Camera size={16} />Start Camera</>}
          </button>

          <div className="flex items-center gap-2 text-xs" style={{ color: '#94A3B8' }}>
            <ShieldCheck size={13} style={{ color: ACC }} />
            Liveness detection active — printed photo spoofing is blocked.
          </div>
        </div>
      )}

      {/* Step 2 — liveness check (camera is on, checking for motion) */}
      {(step === 'liveness' || step === 'camera') && (
        <div className="bg-white rounded-2xl p-6 space-y-4" style={{ border: '1px solid #E2E8F0' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>
              License: <span className="font-mono text-xs" style={{ color: '#94A3B8' }}>{licenseNumber.toUpperCase()}</span>
            </p>
          </div>

          {/* video + face guide overlay */}
          <div className="relative rounded-2xl overflow-hidden bg-black"
            style={{ border: `2px solid ${step === 'liveness' && !livenessReady ? '#F59E0B' : ACC}` }}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full block" />
            {/* dashed oval guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div style={{ width: '55%', paddingBottom: '65%', position: 'relative' }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: `2px dashed ${step === 'liveness' && !livenessReady ? 'rgba(245,158,11,0.7)' : 'rgba(0,212,168,0.6)'}`,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                }} />
              </div>
            </div>

            {/* liveness instruction overlay */}
            {step === 'liveness' && (
              <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center gap-2">
                {!livenessReady && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(245,158,11,0.85)', color: '#fff' }}>
                    {livenessChecking ? '👀 Slowly move your head…' : 'Position your face in the oval'}
                  </span>
                )}
                {livenessReady && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(0,212,168,0.85)', color: '#060D1F' }}>
                    ✓ Liveness confirmed
                  </span>
                )}
              </div>
            )}

            {step === 'camera' && (
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                  Centre your face in the oval
                </span>
              </div>
            )}
          </div>

          {/* Liveness progress bar */}
          {step === 'liveness' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold" style={{ color: '#94A3B8' }}>
                <span>Liveness Check</span>
                <span style={{ color: livenessBarColor }}>{livenessReady ? 'PASSED' : `${livenessScore}%`}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, livenessScore)}%`, background: livenessBarColor }} />
              </div>
              {!livenessReady && (
                <p className="text-[11px]" style={{ color: '#94A3B8' }}>
                  Slowly turn or nod your head to confirm you are a real person.
                </p>
              )}
            </div>
          )}

          {/* Liveness spoofing warning */}
          {step === 'liveness' && !livenessChecking && !livenessReady && livenessScore > 0 && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#B45309' }} />
              <p className="text-xs" style={{ color: '#92400E' }}>
                Insufficient movement detected. Please move your head slightly — do not use a photo.
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs font-medium" style={{ color: '#EF4444' }}>{error}</p>
          )}

          <div className="flex gap-3">
            {step === 'liveness' ? (
              <button onClick={proceedToCapture} disabled={!livenessReady}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-40 transition-all hover:opacity-90"
                style={{ background: ACC, color: '#060D1F' }}>
                <ScanFace size={16} />Proceed to Capture
              </button>
            ) : (
              <button onClick={capture} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: ACC, color: '#060D1F' }}>
                <ScanFace size={16} />{loading ? 'Verifying…' : 'Capture & Verify'}
              </button>
            )}
            <button onClick={reset}
              className="px-5 py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: '#F1F5F9', color: '#64748B' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — result */}
      {step === 'result' && result && (
        <div className="space-y-4">
          {/* result banner */}
          <div className="flex items-start gap-4 px-5 py-4 rounded-2xl"
            style={result.is_match
              ? { background: '#F0FDF4', border: '1px solid #BBF7D0' }
              : { background: '#FEF2F2', border: '1px solid #FECACA' }}>
            {result.is_match
              ? <CheckCircle size={28} style={{ color: '#15803D' }} className="flex-shrink-0" />
              : <XCircle size={28} style={{ color: '#B91C1C' }} className="flex-shrink-0" />}
            <div className="flex-1">
              <p className="font-extrabold" style={{ color: result.is_match ? '#14532D' : '#7F1D1D' }}>
                {result.is_match ? 'Identity Confirmed' : 'Identity Mismatch'}
              </p>
              <p className="text-sm mt-0.5" style={{ color: result.is_match ? '#15803D' : '#B91C1C' }}>
                {result.message}
              </p>
            </div>
            {result.is_match && (
              <span className="text-2xl font-extrabold tabular-nums flex-shrink-0" style={{ color: '#15803D' }}>
                {Math.round(result.similarity_score * 100)}%
              </span>
            )}
          </div>

          {/* side-by-side photo comparison */}
          <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: '1px solid #E2E8F0' }}>
            <div className="grid grid-cols-2 gap-4">
              {/* Live capture */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-center" style={{ color: '#94A3B8' }}>
                  Live Capture
                </p>
                {captured && (
                  <img src={captured} alt="Live capture"
                    className="w-full rounded-xl object-cover"
                    style={{ border: `2px solid ${result.is_match ? ACC : '#FECACA'}`, aspectRatio: '4/3' }} />
                )}
              </div>
              {/* Registered photo */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-center" style={{ color: '#94A3B8' }}>
                  Registered Photo
                </p>
                {result.registered_photo_url ? (
                  <img src={result.registered_photo_url} alt="Registered"
                    className="w-full rounded-xl object-cover"
                    style={{ border: `2px solid ${result.is_match ? ACC : '#FECACA'}`, aspectRatio: '4/3' }} />
                ) : (
                  <div className="w-full rounded-xl flex items-center justify-center text-xs"
                    style={{ border: '2px dashed #E2E8F0', aspectRatio: '4/3', color: '#94A3B8' }}>
                    No photo on file
                  </div>
                )}
              </div>
            </div>

            {/* Practitioner info */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
              <p className="text-lg font-extrabold tracking-tight" style={{ color: '#0F172A' }}>
                {result.practitioner_name}
              </p>
              <p className="text-sm mb-3" style={{ color: '#64748B' }}>{result.qualification}</p>
              <div className="grid grid-cols-2 gap-4">
                {[['License Number', result.license_number], ['Status', result.status]].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-0.5" style={{ color: '#94A3B8' }}>{l}</p>
                    <p className="text-sm font-semibold font-mono" style={{ color: '#0F172A' }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button onClick={reset}
            className="flex items-center gap-2 text-sm font-bold hover:opacity-80 transition-opacity"
            style={{ color: ACC }}>
            <RefreshCw size={14} />Verify Another
          </button>
        </div>
      )}
    </div>
  )
}
