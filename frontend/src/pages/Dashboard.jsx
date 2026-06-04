import { useAuth } from '../context/AuthContext'
import AdminDashboard from './admin/AdminDashboard'
import IssuerDashboard from './issuer/IssuerDashboard'
import VerifierDashboard from './verifier/VerifierDashboard'

export default function Dashboard() {
  const { user } = useAuth()
  const role = user?.is_superuser ? 'ADMIN' : user?.role

  if (role === 'ADMIN')    return <AdminDashboard />
  if (role === 'ISSUER')   return <IssuerDashboard />
  if (role === 'VERIFIER') return <VerifierDashboard />
  return null
}
