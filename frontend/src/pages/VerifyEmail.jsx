import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { verifyEmail } from '../api/auth'

export default function VerifyEmail() {
  const { uid, token } = useParams()
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    verifyEmail(uid, token)
      .then(r => { setMessage(r.data.detail); setStatus('success') })
      .catch(err => {
        setMessage(err.response?.data?.detail || 'Verification failed.')
        setStatus('error')
      })
  }, [uid, token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-10 max-w-sm w-full text-center">
        {status === 'loading' && (
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        )}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-9 h-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Email Verified</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{message}</p>
            <Link to="/login"
              className="inline-block w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition text-center">
              Sign In
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Verification Failed</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{message}</p>
            <Link to="/login"
              className="inline-block w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition text-center">
              Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
