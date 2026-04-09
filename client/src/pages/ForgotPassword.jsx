import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from '../services/toastService'
import authService from '../services/authService'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email && !phone) {
      toast.error('Email or phone is required')
      return
    }
    setSubmitting(true)
    try {
      const chosenEmail = email.trim()
      const chosenPhone = chosenEmail ? '' : phone.trim()
      await authService.requestPasswordReset({ email: chosenEmail, phone: chosenPhone })
      authService.savePendingReset({ email: chosenEmail, phone: chosenPhone })
      toast.success('OTP sent. Continue to reset.')
      navigate('/reset-password', { replace: true })
    } catch (err) {
      toast.error('Failed to send reset OTP')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="bg-white/90 backdrop-blur border border-gray-100 shadow-2xl rounded-2xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-3">
              <img src="../../public/logo.png" alt="HabsifyLogo" className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-['Roboto'] font-black text-primary mb-2">Forgot Password</h1>
            <p className="text-gray-600 text-base">Enter your email or phone to receive an OTP.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Email</label>
              <input
                type="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-lg"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Phone</label>
              <input
                type="tel"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-lg"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 !rounded-button whitespace-nowrap bg-primary text-white text-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Sending...' : 'Send OTP'}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Remembered your password?{' '}
              <a href="/login" className="text-primary hover:text-primary/80 font-semibold">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
