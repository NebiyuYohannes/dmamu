import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from '../services/toastService'
import authService from '../services/authService'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resendOpen, setResendOpen] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resendStatus, setResendStatus] = useState('')
  const [resending, setResending] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Email and password are required')
      return
    }
    try {
      await login({ email, password })
      toast.success('Login successful')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error('Login failed')
    }
  }

  async function handleResend(e) {
    e.preventDefault()
    const trimmed = resendEmail.trim()
    if (!trimmed) {
      toast.error('Email is required')
      return
    }
    setResending(true)
    setResendStatus('')
    try {
      await authService.resendActivation({ email: trimmed })
      setResendStatus('Activation link sent. Check your inbox.')
    } catch (err) {
      toast.error('Failed to resend activation link')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="bg-white/90 backdrop-blur border border-gray-100 shadow-2xl rounded-2xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-3">
              <img src="/logo.png" alt="HabsifyLogo" className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-['Roboto'] font-black text-primary mb-2">Habsify</h1>
            <p className="text-gray-600 text-base">Sign in to continue to your workspace.</p>
          </div>

          {!resendOpen ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-lg"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-lg"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setResendStatus('')
                      setResendEmail(email)
                      setResendOpen(true)
                    }}
                    className="text-sm text-primary hover:text-primary/80 font-semibold"
                  >
                    Resend activation link
                  </button>
                  <a href="/forgot-password" className="text-sm text-primary hover:text-primary/80 font-semibold">Forgot password?</a>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 !rounded-button whitespace-nowrap bg-primary text-white text-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                CONTINUE
              </button>
            </form>
          ) : (
            <form onSubmit={handleResend} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-lg"
                  placeholder="you@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={resending}
                className="w-full py-3 !rounded-button whitespace-nowrap bg-primary text-white text-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {resending ? 'Sending...' : 'Confirm & Send'}
              </button>
              {resendStatus && (
                <p className="text-sm text-green-600 text-center">{resendStatus}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setResendOpen(false)
                  setResendStatus('')
                }}
                className="w-full py-3 !rounded-button whitespace-nowrap border border-gray-300 text-gray-700 text-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            </form>
          )}

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <a href="/signup" className="text-primary hover:text-primary/80 font-semibold">Sign up</a>
            </p>
          </div>

          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">
              By signing up, you agree to our{' '}
              <a href="#" className="text-primary hover:text-primary/80">Terms of Service</a>{' '}
              and{' '}
              <a href="#" className="text-primary hover:text-primary/80">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
