import { Component } from 'react'
import { ShieldCheck, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#060D1F', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '24px 16px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <ShieldCheck size={28} style={{ color: '#F87171' }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#F1F5F9', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.65, margin: '0 0 24px' }}>
            An unexpected error occurred. Your data is safe — refresh the page to continue.
          </p>
          {this.state.error?.message && (
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#334155', marginBottom: 24, padding: '8px 12px', background: '#0B1527', borderRadius: 8, border: '1px solid #162236', wordBreak: 'break-word' }}>
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 22px', borderRadius: 40, background: '#00D4A8',
              color: '#060D1F', fontSize: 14, fontWeight: 700, border: 'none',
              cursor: 'pointer', transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <RefreshCw size={15} />Refresh page
          </button>
        </div>
      </div>
    )
  }
}
