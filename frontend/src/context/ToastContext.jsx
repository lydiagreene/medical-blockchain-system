import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(null)

const icons = {
  success: <CheckCircle size={18} style={{ color: '#00D4A8', flexShrink: 0 }} />,
  error:   <XCircle size={18} style={{ color: '#F87171', flexShrink: 0 }} />,
  warning: <AlertTriangle size={18} style={{ color: '#FCD34D', flexShrink: 0 }} />,
}

function ToastItem({ id, message, type, onClose }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      background: '#0B1527', border: '1px solid #1A2E4A',
      borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      padding: '12px 14px', minWidth: 280, maxWidth: 360,
      animation: 'slideInRight 0.2s ease',
    }}>
      <style>{`@keyframes slideInRight { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }`}</style>
      {icons[type] || icons.success}
      <p style={{ fontSize: 13, color: '#CBD5E1', flex: 1, lineHeight: 1.5, margin: 0 }}>{message}</p>
      <button onClick={() => onClose(id)} style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}
        onMouseEnter={e => e.currentTarget.style.color = '#94A3B8'}
        onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500)
  }, [])

  const remove = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onClose={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
