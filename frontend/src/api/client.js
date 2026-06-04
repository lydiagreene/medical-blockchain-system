import axios from 'axios'

const client = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,  // send HttpOnly auth_token cookie on every request
})

// No Authorization header needed — auth is via HttpOnly cookie

client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Only redirect to login when not already on a public path
      const pub = ['/', '/login', '/register', '/pending', '/verify',
                   '/forgot-password', '/2fa/setup', '/verify-email', '/reset-password']
      const onPublic = pub.some(p => window.location.pathname.startsWith(p))
      if (!onPublic) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

export default client
