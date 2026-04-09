import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from '../services/toastService'
import authService from '../services/authService'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function OtpVerify() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(120)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const pending = authService.getPendingSignup()
    if (!pending) {
      toast.error('No signup data found')
      navigate('/signup', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!code.trim()) {
      toast.error('OTP code is required')
      return
    }
    if (secondsLeft <= 0) {
      toast.error('OTP expired')
      return
    }
    setSubmitting(true)
    try {
      await authService.verifyOtp(code.trim())
      toast.success('OTP verified')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error('OTP verification failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-2">
            <img src="../../public/logo.png" alt="HabsifyLogo" />
          </div>
          <h1 className="text-3xl font-['Roboto'] font-black text-primary mb-2">Verify OTP</h1>
          <p className="text-gray-600 text-lg">Enter the code sent to your email/phone.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">OTP Code</label>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg"
              placeholder="Enter OTP"
              required
            />
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Time remaining</span>
            <span className="font-semibold text-gray-900">{formatTime(secondsLeft)}</span>
          </div>
          <button type="submit" disabled={submitting || secondsLeft <= 0} className="w-full py-3 !rounded-button whitespace-nowrap bg-primary text-white text-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
            {submitting ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  )
}

