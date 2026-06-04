import { Link } from 'react-router-dom'
import { ShieldCheck, Clock, Mail, CheckCircle2 } from 'lucide-react'

const BG   = '#060D1F'
const CARD = '#0B1527'
const BDR  = '#162236'
const ACC  = '#00D4A8'

export default function PendingApproval() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: BG, fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '24px 16px',
    }}>
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none grid-bg opacity-40" />
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,212,168,0.06) 0%, transparent 70%)` }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32, textDecoration: 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: ACC, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px rgba(0,212,168,0.3)` }}>
            <ShieldCheck size={20} color={BG} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.01em' }}>
            VerifyDoc Uganda
          </span>
        </Link>

        {/* Card */}
        <div style={{
          background: CARD, border: `1px solid ${BDR}`, borderRadius: 20,
          padding: '40px 36px', textAlign: 'center',
          boxShadow: `0 0 0 1px ${BDR}, 0 8px 32px rgba(0,0,0,0.3)`,
        }}>
          {/* Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 20px',
            background: 'rgba(234,179,8,0.08)',
            border: '1px solid rgba(234,179,8,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(234,179,8,0.12)',
          }}>
            <Clock size={30} style={{ color: '#EAB308' }} />
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Account Pending Approval
          </h1>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.65, margin: '0 0 28px' }}>
            Your account has been created. An administrator will review and
            approve it shortly.
          </p>

          {/* Steps */}
          <div style={{
            background: '#060D1F', border: `1px solid ${BDR}`, borderRadius: 14,
            padding: '18px 20px', marginBottom: 28, textAlign: 'left',
          }}>
            {[
              { icon: CheckCircle2, color: ACC,       text: 'Account created successfully' },
              { icon: Clock,        color: '#EAB308',  text: 'Awaiting admin review' },
              { icon: Mail,         color: '#60A5FA',  text: "You'll be emailed once approved" },
            ].map(({ icon: Icon, color, text }, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                paddingTop: i > 0 ? 12 : 0,
                marginTop: i > 0 ? 12 : 0,
                borderTop: i > 0 ? `1px solid ${BDR}` : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: `${color}12`,
                  border: `1px solid ${color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>

          <Link
            to="/login"
            style={{
              display: 'block', width: '100%', padding: '12px',
              borderRadius: 40, background: ACC, color: BG,
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
              textAlign: 'center', transition: 'opacity 0.2s',
              boxShadow: `0 4px 16px rgba(0,212,168,0.25)`,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Back to Sign In
          </Link>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#1E3A5F', marginTop: 20 }}>
          Already approved?{' '}
          <Link to="/login" style={{ color: '#334155', fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={e => e.target.style.color = ACC}
            onMouseLeave={e => e.target.style.color = '#334155'}>
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  )
}
