import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, ArrowRight, CheckCircle, XCircle,
  Lock, Zap, Database, Brain, Globe, Users, Eye,
  Search, ChevronRight, Link2, Menu, X as XIcon,
} from 'lucide-react'
import useDocumentTitle from '../hooks/useDocumentTitle'

/* ── tokens ─────────────────────────────────────────────────────────────────── */
const T = {
  bg:      '#030712',
  surface: '#0A0F1E',
  card:    '#0D1527',
  border:  '#1A2744',
  accent:  '#00D4A8',
  blue:    '#4A9EFF',
  purple:  '#8B5CF6',
  text:    '#F1F5F9',
  sub:     '#94A3B8',
  muted:   '#475569',
}

/* ── helpers ─────────────────────────────────────────────────────────────────── */
function FadeIn({ children, delay = 0, className = '', y = 20 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  )
}

function AnimatedCounter({ to, suffix = '', prefix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    let v = 0
    const step = Math.max(1, Math.ceil(to / 60))
    const id = setInterval(() => {
      v = Math.min(v + step, to)
      setN(v)
      if (v >= to) clearInterval(id)
    }, 14)
    return () => clearInterval(id)
  }, [inView, to])
  return <span ref={ref}>{prefix}{n.toLocaleString()}{suffix}</span>
}

/* ── credential card visual ──────────────────────────────────────────────────── */
function CredentialCard({ delay = 0 }) {
  const [verified, setVerified] = useState(false)
  const [hash, setHash] = useState('')
  const fullHash = '0x4f3a…b82c · Sepolia'

  useEffect(() => {
    const t1 = setTimeout(() => setVerified(true), delay + 900)
    let i = 0
    const t2 = setTimeout(() => {
      const iv = setInterval(() => {
        i++
        setHash(fullHash.slice(0, i))
        if (i >= fullHash.length) clearInterval(iv)
      }, 30)
    }, delay + 1400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [delay])

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.8, delay: delay / 1000 + 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: T.card,
        border: `1px solid ${verified ? T.accent + '50' : T.border}`,
        boxShadow: verified ? `0 0 40px ${T.accent}15` : '0 8px 32px rgba(0,0,0,0.4)',
        borderRadius: 20, padding: '20px 24px', width: 300,
        transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
      }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={15} color={T.accent} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>UMDPC</div>
            <div style={{ fontSize: 10, color: T.muted }}>Uganda</div>
          </div>
        </div>
        <AnimatePresence>
          {verified && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: `${T.accent}15`, border: `1px solid ${T.accent}40`,
                borderRadius: 20, padding: '3px 10px',
              }}>
              <CheckCircle size={10} color={T.accent} />
              <span style={{ fontSize: 10, fontWeight: 700, color: T.accent, letterSpacing: '0.04em' }}>VERIFIED</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* practitioner */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 2 }}>Dr. Sarah Nakato</div>
        <div style={{ fontSize: 12, color: T.sub }}>MBChB · Cardiology</div>
      </div>

      {/* fields */}
      {[
        ['License', 'UMDPC/2024/00891'],
        ['Expires',  '2026-12-31'],
        ['Institution', 'Makerere University'],
      ].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: T.muted }}>{k}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.sub, fontFamily: k === 'License' ? 'monospace' : undefined }}>{v}</span>
        </div>
      ))}

      {/* blockchain hash */}
      <div style={{
        marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Link2 size={10} color={T.blue} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: T.blue, minHeight: 14 }}>
          {hash}{hash.length < fullHash.length && hash.length > 0 ? '▋' : ''}
        </span>
      </div>
    </motion.div>
  )
}

function RejectedCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: 1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 1.5 }}
      transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: T.card,
        border: '1px solid rgba(239,68,68,0.3)',
        boxShadow: '0 0 24px rgba(239,68,68,0.08)',
        borderRadius: 16, padding: '14px 18px', width: 210,
      }}>
      <div style={{ display: 'flex', items: 'center', gap: 6, marginBottom: 8 }}>
        <XCircle size={13} color="#EF4444" style={{ display: 'inline' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', marginLeft: 4, letterSpacing: '0.04em' }}>NOT FOUND</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.sub, marginBottom: 3 }}>John Doe</div>
      <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#EF444490' }}>FAKE/0000/99999</div>
      <div style={{ fontSize: 10, color: T.muted, marginTop: 8 }}>No blockchain record found.</div>
    </motion.div>
  )
}

/* ── section label ────────────────────────────────────────────────────────────── */
const Label = ({ text }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: T.accent, background: `${T.accent}10`, border: `1px solid ${T.accent}25`,
    padding: '4px 12px', borderRadius: 20, marginBottom: 16,
  }}>
    <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.accent }} />
    {text}
  </div>
)

/* ── feature bento ───────────────────────────────────────────────────────────── */
function BentoCard({ icon, colour, title, desc, wide }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridColumn: wide ? 'span 2' : 'span 1',
        background: T.card,
        border: `1px solid ${hovered ? colour + '50' : T.border}`,
        borderRadius: 16, padding: '24px',
        boxShadow: hovered ? `0 0 32px ${colour}0D` : 'none',
        transition: 'border-color 0.25s, box-shadow 0.25s',
        cursor: 'default',
      }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, marginBottom: 16,
        background: `${colour}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: colour,
        transition: 'background 0.25s',
        ...(hovered ? { background: `${colour}25` } : {}),
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6 }}>{desc}</div>
    </div>
  )
}

/* ── comparison row ──────────────────────────────────────────────────────────── */
function CompRow({ label, manual, modern }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
      <div style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: T.sub, background: T.surface }}>{label}</div>
      <div style={{ padding: '14px 20px', fontSize: 13, color: '#EF444490', background: '#1A0A0A', display: 'flex', alignItems: 'center', gap: 8 }}>
        <XCircle size={13} color="#EF4444" style={{ flexShrink: 0 }} /> {manual}
      </div>
      <div style={{ padding: '14px 20px', fontSize: 13, color: T.accent, background: '#0A1A16', display: 'flex', alignItems: 'center', gap: 8 }}>
        <CheckCircle size={13} color={T.accent} style={{ flexShrink: 0 }} /> {modern}
      </div>
    </div>
  )
}

/* ── main ─────────────────────────────────────────────────────────────────────── */
export default function Landing() {
  useDocumentTitle('')
  const [navSolid, setNavSolid] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [verifyInput, setVerifyInput] = useState('')

  useEffect(() => {
    const h = () => setNavSolid(window.scrollY > 40)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <div style={{ background: T.bg, color: T.text, minHeight: '100vh', overflowX: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── ambient blobs ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 600, borderRadius: '50%',
          background: `radial-gradient(ellipse, ${T.accent}08 0%, transparent 70%)`,
        }} />
        <div style={{
          position: 'absolute', bottom: 100, right: -100,
          width: 500, height: 500, borderRadius: '50%',
          background: `radial-gradient(ellipse, ${T.purple}06 0%, transparent 70%)`,
        }} />
      </div>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 56, display: 'flex', alignItems: 'center',
        padding: '0 32px',
        background: navSolid ? `${T.bg}F0` : 'transparent',
        backdropFilter: navSolid ? 'blur(16px)' : 'none',
        borderBottom: navSolid ? `1px solid ${T.border}` : 'none',
        transition: 'all 0.25s',
      }}>
        <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          {/* logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={14} color={T.bg} strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>VerifyDoc</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
              background: `${T.accent}15`, color: T.accent, border: `1px solid ${T.accent}30`,
              letterSpacing: '0.04em',
            }}>UGANDA</span>
          </div>

          {/* desktop links */}
          <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 4 }}>
            <Link to="/verify" style={{ fontSize: 13, color: T.muted, padding: '6px 14px', borderRadius: 8, textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.target.style.color = T.text}
              onMouseLeave={e => e.target.style.color = T.muted}>
              Verify
            </Link>
            <Link to="/login" style={{ fontSize: 13, color: T.muted, padding: '6px 14px', borderRadius: 8, textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.target.style.color = T.text}
              onMouseLeave={e => e.target.style.color = T.muted}>
              Sign in
            </Link>
            <Link to="/register" style={{
              fontSize: 13, fontWeight: 700, padding: '7px 18px', borderRadius: 20, textDecoration: 'none',
              background: T.accent, color: T.bg, transition: 'opacity 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              Get Started
            </Link>
          </div>

          {/* mobile hamburger */}
          <button className="flex sm:hidden" onClick={() => setMobileMenu(o => !o)}
            style={{ background: 'none', border: 'none', color: T.sub, cursor: 'pointer', padding: 6 }}
            aria-label="Open navigation menu">
            {mobileMenu ? <XIcon size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* mobile menu drawer */}
      <AnimatePresence>
        {mobileMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'fixed', top: 56, left: 0, right: 0, zIndex: 49,
              background: `${T.bg}F8`, backdropFilter: 'blur(20px)',
              borderBottom: `1px solid ${T.border}`,
              padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
            {[['Verify Credential', '/verify'], ['Sign in', '/login']].map(([l, to]) => (
              <Link key={l} to={to} onClick={() => setMobileMenu(false)}
                style={{ fontSize: 15, fontWeight: 600, color: T.sub, textDecoration: 'none', padding: '10px 0', borderBottom: `1px solid ${T.border}` }}
                onMouseEnter={e => e.currentTarget.style.color = T.text}
                onMouseLeave={e => e.currentTarget.style.color = T.sub}>
                {l}
              </Link>
            ))}
            <Link to="/register" onClick={() => setMobileMenu(false)}
              style={{
                marginTop: 8, padding: '12px', borderRadius: 40, textAlign: 'center',
                background: T.accent, color: T.bg, fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}>
              Create an Account
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ── */}
      <section style={{ paddingTop: 130, paddingBottom: 80, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 60, alignItems: 'center' }}>

            {/* left text */}
            <div style={{ maxWidth: 560 }}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 600, color: T.sub,
                    background: T.surface, border: `1px solid ${T.border}`,
                    padding: '5px 14px', borderRadius: 20, marginBottom: 28, textDecoration: 'none',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent + '50'; e.currentTarget.style.color = T.text }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.sub }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }} />
                  Live on Ethereum Sepolia
                  <ChevronRight size={12} />
                </a>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                style={{ fontSize: 'clamp(38px, 5vw, 60px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 20px' }}>
                The credential layer<br />
                <span style={{ background: `linear-gradient(135deg, ${T.accent} 0%, ${T.blue} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Uganda's healthcare
                </span>{' '}needs.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.18 }}
                style={{ fontSize: 16, color: T.sub, lineHeight: 1.7, marginBottom: 32, maxWidth: 480 }}>
                Every medical credential recorded permanently on the blockchain — tamper-proof,
                instantly verifiable, and permanently linked to IPFS documents. Zero forgery. Zero doubt.
              </motion.p>

              {/* inline verify bar */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.28 }}
                style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
                  <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.muted, pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Enter a UMDPC license number…"
                    value={verifyInput}
                    onChange={e => setVerifyInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && verifyInput.trim() && (window.location.href = `/verify?q=${verifyInput.trim()}`)}
                    style={{
                      width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
                      borderRadius: 12, fontSize: 13, fontFamily: 'inherit',
                      background: T.surface, border: `1px solid ${T.border}`, color: T.text, outline: 'none',
                      boxSizing: 'border-box', transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.target.style.borderColor = T.accent + '70'}
                    onBlur={e => e.target.style.borderColor = T.border}
                  />
                </div>
                <Link to={verifyInput.trim() ? `/verify?q=${verifyInput.trim()}` : '/verify'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                    background: T.accent, color: T.bg, textDecoration: 'none',
                    whiteSpace: 'nowrap', transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  Verify Free
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <Link to="/register"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 13, fontWeight: 700, color: T.text, textDecoration: 'none',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = T.accent}
                  onMouseLeave={e => e.currentTarget.style.color = T.text}>
                  Create an account <ArrowRight size={13} />
                </Link>
                <span style={{ color: T.border }}>·</span>
                <span style={{ fontSize: 12, color: T.muted }}>Free to verify · No signup needed</span>
              </motion.div>
            </div>

            {/* right — credential cards */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{ position: 'relative', flexShrink: 0 }}
              className="hidden lg:block">
              <div style={{ position: 'relative', width: 340, height: 340 }}>
                {/* glow behind */}
                <div style={{
                  position: 'absolute', inset: 40, borderRadius: '50%',
                  background: `radial-gradient(ellipse, ${T.accent}12 0%, transparent 70%)`,
                  filter: 'blur(24px)',
                }} />
                {/* main card */}
                <div style={{ position: 'absolute', top: 20, left: 20 }}>
                  <CredentialCard delay={600} />
                </div>
                {/* rejected card — behind and offset */}
                <div style={{ position: 'absolute', bottom: 10, right: -10, zIndex: 0 }}>
                  <RejectedCard />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ position: 'relative', zIndex: 1, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
            {[
              { n: 15000, suffix: '+',  label: 'Credentials issued',     colour: T.accent },
              { n: 3,     prefix: '<',  label: 'Seconds to verify',       colour: T.blue, suffix: 's' },
              { n: 200,   suffix: '+',  label: 'Healthcare institutions', colour: T.purple },
              { n: 100,   suffix: '%',  label: 'On-chain records',         colour: '#4ADE80' },
            ].map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.08}>
                <div style={{
                  padding: '28px 24px',
                  borderRight: i < 3 ? `1px solid ${T.border}` : 'none',
                }}>
                  <div style={{ fontSize: 'clamp(28px, 3vw, 38px)', fontWeight: 900, letterSpacing: '-0.02em', color: s.colour, marginBottom: 4 }}>
                    <AnimatedCounter to={s.n} suffix={s.suffix} prefix={s.prefix || ''} />
                  </div>
                  <div style={{ fontSize: 13, color: T.muted }}>{s.label}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUSTED BY ── */}
      <section style={{ padding: '40px 32px', position: 'relative', zIndex: 1, background: T.surface }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, textAlign: 'center', marginBottom: 24 }}>
              Trusted by Uganda's leading medical institutions
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px 32px' }}>
              {['Makerere University', 'Mulago Hospital', 'UMDPC', 'IHK Kampala', 'Butabika Hospital', 'Aga Khan Uganda'].map(name => (
                <div key={name} style={{
                  fontSize: 13, fontWeight: 600, color: T.muted,
                  padding: '8px 20px', borderRadius: 8,
                  background: T.card, border: `1px solid ${T.border}`,
                }}>
                  {name}
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section style={{ padding: '80px 32px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <FadeIn className="text-center" style={{ textAlign: 'center', marginBottom: 40 }}>
            <Label text="The Difference" />
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px', lineHeight: 1.15 }}>
              Old way vs. the right way
            </h2>
            <p style={{ fontSize: 14, color: T.sub }}>Uganda's paper-based credential system has critical gaps that put patients at risk.</p>
          </FadeIn>

          <FadeIn>
            <div style={{ borderRadius: 16, overflowX: 'auto', border: `1px solid ${T.border}` }}>
              {/* column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: T.bg }}>
                <div style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.muted, background: T.card }}>Aspect</div>
                <div style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#EF4444', background: '#120A0A' }}>Manual / Paper</div>
                <div style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.accent, background: '#0A140F' }}>VerifyDoc</div>
              </div>
              {[
                ['Verification speed',      '7+ days manual review',      'Under 3 seconds'],
                ['Forgery protection',      'None — easy to fake',        'Blockchain-immutable'],
                ['Audit trail',             'Paper files, often lost',    'Full timestamped log'],
                ['Face verification',       'Manual ID card check',       'AI biometric match'],
                ['Expiry management',       'No alerts, missed renewals', 'Automated SMS + email'],
                ['Availability',            'Office hours only',          '24/7, anywhere'],
              ].map(row => (
                <FadeIn key={row[0]}>
                  <CompRow label={row[0]} manual={row[1]} modern={row[2]} />
                </FadeIn>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FEATURES BENTO ── */}
      <section style={{ padding: '0 32px 80px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn style={{ textAlign: 'center', marginBottom: 40 }}>
            <Label text="Features" />
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.15 }}>
              Built for trust, at scale
            </h2>
          </FadeIn>

          <FadeIn>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
              <BentoCard icon={<Lock size={20} />} colour={T.accent} title="Immutable Records"
                desc="Every credential anchored to Ethereum. No one — not even the issuer — can alter or delete it after recording." />
              <BentoCard icon={<Zap size={20} />} colour={T.blue} title="Instant Verification"
                desc="Real-time blockchain query returns a verified result in under 3 seconds. Available 24/7 from any browser." />
              <BentoCard icon={<Brain size={20} />} colour={T.purple} title="AI Fraud Detection"
                desc="Machine learning flags suspicious verification patterns and sends real-time alerts to administrators." />
              <BentoCard icon={<Eye size={20} />} colour={T.accent} title="Biometric Verification"
                desc="DeepFace AI matches the practitioner's live camera feed against their registered IPFS photo." wide />
              <BentoCard icon={<Database size={20} />} colour={T.blue} title="IPFS Storage"
                desc="Documents stored on a decentralised network. No single server to hack." />
              <BentoCard icon={<Globe size={20} />} colour={T.purple} title="Public Portal"
                desc="No login needed. Employers and hospitals verify any license 24/7 at verifydoc.ug/verify." />
              <BentoCard icon={<Users size={20} />} colour={T.accent} title="Role-Based Workflows"
                desc="Separate dashboards for Issuers, Verifiers and Admins with a full audit trail on every action." wide />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '80px 32px', position: 'relative', zIndex: 1, background: T.surface, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <FadeIn style={{ textAlign: 'center', marginBottom: 48 }}>
            <Label text="How It Works" />
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Three steps. Zero forgery.
            </h2>
          </FadeIn>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 0, position: 'relative' }}>
            {/* connector line */}
            <div style={{
              position: 'absolute', top: 28, left: '16%', right: '16%', height: 1,
              background: `linear-gradient(90deg, ${T.accent}60, ${T.blue}60, ${T.purple}60)`,
            }} />

            {[
              { n: '01', colour: T.accent,  title: 'Issue on-chain',     desc: 'Medical schools & UMDPC register credentials. Permanently signed to Ethereum.' },
              { n: '02', colour: T.blue,    title: 'Store on IPFS',       desc: 'Original documents pinned to IPFS. Content hash bound on-chain — any alteration is instantly detectable.' },
              { n: '03', colour: T.purple,  title: 'Verify in < 3s',     desc: 'Enter a license number. The blockchain returns a verified result immediately. No login required.' },
            ].map((s, i) => (
              <FadeIn key={s.title} delay={i * 0.12} style={{ padding: '0 24px', textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: `${s.colour}15`, border: `1px solid ${s.colour}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px', position: 'relative', zIndex: 1,
                }}>
                  <span style={{ fontSize: 16, fontWeight: 900, color: s.colour }}>{s.n}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.65 }}>{s.desc}</div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECURITY ── */}
      <section style={{ padding: '80px 32px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <FadeIn style={{ textAlign: 'center', marginBottom: 40 }}>
            <Label text="Security Stack" />
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Defence in depth
            </h2>
          </FadeIn>

          <FadeIn>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {[
                { icon: <Link2 size={15} />,        colour: T.accent,  label: 'Ethereum Blockchain',    sub: 'Every TX viewable on Etherscan · Sepolia testnet' },
                { icon: <Database size={15} />,     colour: T.blue,    label: 'IPFS Content Hashing',   sub: 'SHA-256 hashes pinned on-chain permanently' },
                { icon: <ShieldCheck size={15} />,  colour: T.purple,  label: 'Smart Contract Rules',   sub: 'Business logic enforced in Solidity' },
                { icon: <Eye size={15} />,           colour: '#4ADE80', label: 'Full Audit Log',         sub: 'Every admin action timestamped & attributed' },
                { icon: <Brain size={15} />,         colour: T.accent,  label: 'ML Anomaly Detection',  sub: 'Real-time fraud pattern analysis via scikit-learn' },
                { icon: <Lock size={15} />,          colour: T.blue,    label: 'DRF Token Auth + CORS', sub: 'Per-endpoint rate limiting · HSTS + HTTPS enforced' },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 12,
                  background: T.card, border: `1px solid ${T.border}`,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${item.colour}15`, color: item.colour }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{item.sub}</div>
                  </div>
                  <CheckCircle size={13} color="#4ADE80" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '80px 32px', position: 'relative', zIndex: 1, borderTop: `1px solid ${T.border}` }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 50% 80% at 50% 100%, ${T.accent}07 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <FadeIn>
          <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(30px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px' }}>
              Uganda's patients deserve{' '}
              <span style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                verified doctors.
              </span>
            </h2>
            <p style={{ fontSize: 15, color: T.sub, marginBottom: 32, lineHeight: 1.6 }}>
              Join hospitals, licensing bodies, and medical schools protecting patients with blockchain-verified credentials.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              <Link to="/register"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 14, fontSize: 14, fontWeight: 700,
                  background: T.accent, color: T.bg, textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                Create an Account <ArrowRight size={15} />
              </Link>
              <Link to="/verify"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 14, fontSize: 14, fontWeight: 700,
                  background: T.surface, color: T.sub,
                  border: `1px solid ${T.border}`, textDecoration: 'none',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent + '40'; e.currentTarget.style.color = T.text }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.sub }}>
                Try Public Verification
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${T.border}`, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px 20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32, marginBottom: 28 }}>
            {/* brand */}
            <div style={{ maxWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={12} color={T.bg} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: T.sub, letterSpacing: '-0.01em' }}>VerifyDoc Uganda</span>
              </div>
              <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, margin: 0 }}>
                Blockchain-based medical credential verification built for Uganda's healthcare system.
              </p>
            </div>
            {/* nav groups */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted, marginBottom: 12 }}>Platform</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['Verify a Credential', '/verify'], ['Sign In', '/login'], ['Create Account', '/register']].map(([l, to]) => (
                    <Link key={l} to={to} style={{ fontSize: 13, color: T.muted, textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.target.style.color = T.text}
                      onMouseLeave={e => e.target.style.color = T.muted}>{l}</Link>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted, marginBottom: 12 }}>Legal</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['Privacy Policy', '/privacy'], ['Terms of Use', '/terms'], ['Contact', '/contact']].map(([l, to]) => (
                    <Link key={l} to={to} style={{ fontSize: 13, color: T.muted, textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.target.style.color = T.text}
                      onMouseLeave={e => e.target.style.color = T.muted}>{l}</Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 12, color: T.muted }}>© {new Date().getFullYear()} VerifyDoc Uganda. All rights reserved.</span>
            <span style={{ fontSize: 12, color: T.muted }}>Built on Ethereum Sepolia · Stored on IPFS</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
