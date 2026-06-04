import { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, RefreshCw, X, CheckCircle } from 'lucide-react'

const ACC = '#00D4A8'

export default function WebcamCapture({ onCapture, onClear, captured }) {
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [error, setError] = useState('')
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (stream && videoRef.current && active) {
      videoRef.current.srcObject = stream
    }
  }, [stream, active])

  useEffect(() => () => {
    if (stream) stream.getTracks().forEach(t => t.stop())
  }, [stream])

  const startCamera = useCallback(async () => {
    setError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      setStream(s)
      setActive(true)
    } catch {
      setError('Camera access denied — please allow camera permissions.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null) }
    setActive(false)
  }, [stream])

  const capture = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    const base64 = c.toDataURL('image/jpeg', 0.85)
    stopCamera()
    onCapture(base64)
  }, [stopCamera, onCapture])

  const clear = useCallback(() => { stopCamera(); onClear() }, [stopCamera, onClear])

  if (captured) {
    return (
      <div className="space-y-2">
        <img src={captured} alt="Captured face"
          className="w-full rounded-xl object-cover"
          style={{ border: `2px solid ${ACC}`, maxHeight: 240 }} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#15803D' }}>
            <CheckCircle size={12} /> Photo captured
          </div>
          <button type="button" onClick={clear}
            className="flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ color: '#94A3B8' }}>
            <RefreshCw size={11} />Retake
          </button>
        </div>
      </div>
    )
  }

  if (active) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-xl overflow-hidden"
          style={{ border: `2px solid ${ACC}` }}>
          <video ref={videoRef} autoPlay playsInline muted className="block w-full" style={{ maxHeight: 240 }} />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={capture}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
            style={{ background: ACC, color: '#060D1F' }}>
            <Camera size={12} />Capture
          </button>
          <button type="button" onClick={stopCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            style={{ border: '1px solid #E2E8F0', color: '#64748B', background: '#F8FAFC' }}>
            <X size={12} />Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {error && <p className="text-xs font-medium" style={{ color: '#EF4444' }}>{error}</p>}
      <button type="button" onClick={startCamera}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors hover:opacity-80"
        style={{ border: '1px solid #E2E8F0', color: '#64748B', background: '#F8FAFC' }}>
        <Camera size={13} />Use Webcam
      </button>
    </div>
  )
}
