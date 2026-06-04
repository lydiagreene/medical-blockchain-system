import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

// Eagerly loaded (tiny, always needed)
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import PendingApproval from './pages/PendingApproval'
import NotFound from './pages/NotFound'
import PublicVerify from './pages/PublicVerify'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import TwoFactorSetup from './pages/TwoFactorSetup'
import VerifyEmail from './pages/VerifyEmail'

// Lazy loaded (loaded on demand)
const Dashboard          = lazy(() => import('./pages/Dashboard'))
const AllCredentials     = lazy(() => import('./pages/admin/AllCredentials'))
const PendingUsers       = lazy(() => import('./pages/admin/PendingUsers'))
const AuditLog           = lazy(() => import('./pages/admin/AuditLog'))
const FraudDashboard     = lazy(() => import('./pages/admin/FraudDashboard'))
const Institutions       = lazy(() => import('./pages/admin/Institutions'))
const IssueCredential    = lazy(() => import('./pages/issuer/IssueCredential'))
const IssuerCredentials  = lazy(() => import('./pages/issuer/IssuerCredentials'))
const VerifyCredential   = lazy(() => import('./pages/verifier/VerifyCredential'))
const FaceVerify         = lazy(() => import('./pages/verifier/FaceVerify'))
const CredentialDetail   = lazy(() => import('./pages/CredentialDetail'))
const Profile            = lazy(() => import('./pages/Profile'))

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--app-card-bdr)', borderTopColor: 'var(--clr-accent)', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
}

function Guarded({ children, role }) {
  return (
    <ProtectedRoute role={role}>
      <Layout>
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </Layout>
    </ProtectedRoute>
  )
}

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.16, ease: 'easeOut' } },
  exit:    { opacity: 0,       transition: { duration: 0.1 } },
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ display: 'contents' }}>
        <Routes location={location}>
          {/* Public */}
          <Route path="/"         element={<Landing />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pending"  element={<PendingApproval />} />
          <Route path="/verify"                             element={<PublicVerify />} />
          <Route path="/forgot-password"                    element={<ForgotPassword />} />
          <Route path="/reset-password/:uid/:token"         element={<ResetPassword />} />
          <Route path="/2fa/setup"                          element={<TwoFactorSetup />} />
          <Route path="/verify-email/:uid/:token"           element={<VerifyEmail />} />

          {/* Any authenticated user */}
          <Route path="/dashboard"         element={<Guarded><Dashboard /></Guarded>} />
          <Route path="/credentials/:id"   element={<Guarded><CredentialDetail /></Guarded>} />
          <Route path="/profile"           element={<Guarded><Profile /></Guarded>} />

          {/* Admin */}
          <Route path="/admin/credentials"  element={<Guarded role="ADMIN"><AllCredentials /></Guarded>} />
          <Route path="/admin/users"         element={<Guarded role="ADMIN"><PendingUsers /></Guarded>} />
          <Route path="/admin/institutions"  element={<Guarded role="ADMIN"><Institutions /></Guarded>} />
          <Route path="/admin/audit-log"     element={<Guarded role="ADMIN"><AuditLog /></Guarded>} />
          <Route path="/admin/fraud"         element={<Guarded role="ADMIN"><FraudDashboard /></Guarded>} />

          {/* Issuer */}
          <Route path="/issuer/issue" element={<Guarded role="ISSUER"><IssueCredential /></Guarded>} />
          <Route path="/issuer/list"  element={<Guarded role="ISSUER"><IssuerCredentials /></Guarded>} />

          {/* Verifier */}
          <Route path="/verifier/verify"       element={<Guarded role="VERIFIER"><VerifyCredential /></Guarded>} />
          <Route path="/verifier/face-verify"  element={<Guarded role="VERIFIER"><FaceVerify /></Guarded>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AnimatedRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  )
}
