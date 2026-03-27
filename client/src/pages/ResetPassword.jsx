import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from '../services/toastService'
import authService from '../services/authService'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    phone: '',
    otp: '',
    new_password: '',
    re_new_password: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const pending = authService.getPendingReset()
    if (pending?.email || pending?.phone) {
      setForm(prev => ({
        ...prev,
        email: pending.email || '',
        phone: pending.phone || ''
      }))
    }
  }, [])

  function updateField(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmedEmail = form.email.trim()
    const trimmedPhone = form.phone.trim()
    if (!trimmedEmail && !trimmedPhone) {
      toast.error('Email or phone is required')
      return
    }
    if (trimmedEmail && trimmedPhone) {
      toast.error('Use email or phone, not both')
      return
    }
    if (!form.otp || !form.new_password || !form.re_new_password) {
      toast.error('OTP and passwords are required')
      return
    }
    if (form.new_password !== form.re_new_password) {
      toast.error('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      await authService.resetPassword({
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
        otp: form.otp,
        new_password: form.new_password,
        re_new_password: form.re_new_password
      })
      authService.clearPendingReset()
      toast.success('Password reset successful')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error('Password reset failed')
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
              <img src="/logo.png" alt="HabsifyLogo" className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-['Roboto'] font-black text-primary mb-2">Reset Password</h1>
            <p className="text-gray-600 text-base">Enter the OTP and set a new password.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                name="email"
                type="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.email}
                onChange={updateField}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                name="phone"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.phone}
                onChange={updateField}
                placeholder="+2519XXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">OTP</label>
              <input name="otp" required className="w-full px-4 py-3 border border-gray-300 rounded-xl" value={form.otp} onChange={updateField} placeholder="Enter OTP" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input name="new_password" type="password" required className="w-full px-4 py-3 border border-gray-300 rounded-xl" value={form.new_password} onChange={updateField} placeholder="New password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
              <input name="re_new_password" type="password" required className="w-full px-4 py-3 border border-gray-300 rounded-xl" value={form.re_new_password} onChange={updateField} placeholder="Confirm new password" />
            </div>
            <button type="submit" disabled={submitting} className="w-full py-3 !rounded-button whitespace-nowrap bg-primary text-white text-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
              {submitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Back to{' '}
              <a href="/login" className="text-primary hover:text-primary/80 font-semibold">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
