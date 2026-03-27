import api from './api'

const STORAGE_KEY = 'habsify.auth'
const PENDING_KEY = 'habsify.signup'
const RESET_KEY = 'habsify.reset'
let memoryStore = {}

function getStorage() {
  if (typeof window === 'undefined') {
    return {
      getItem: (key) => (key in memoryStore ? memoryStore[key] : null),
      setItem: (key, value) => { memoryStore[key] = value },
      removeItem: (key) => { delete memoryStore[key] }
    }
  }
  return window.localStorage
}

export function buildLoginPayload({ countryCode, phone, pin }) {
  return {
    country_code: countryCode,
    phone,
    pin
  }
}

export function saveSession(session) {
  const storage = getStorage()
  storage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function getSession() {
  const storage = getStorage()
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (err) {
    return null
  }
}

export function clearSession() {
  const storage = getStorage()
  storage.removeItem(STORAGE_KEY)
}

export function getToken() {
  return getSession()?.token || null
}

export function savePendingSignup(data) {
  const storage = getStorage()
  storage.setItem(PENDING_KEY, JSON.stringify(data))
}

export function getPendingSignup() {
  const storage = getStorage()
  const raw = storage.getItem(PENDING_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (err) {
    return null
  }
}

export function clearPendingSignup() {
  const storage = getStorage()
  storage.removeItem(PENDING_KEY)
}

export function savePendingReset(data) {
  const storage = getStorage()
  storage.setItem(RESET_KEY, JSON.stringify(data))
}

export function getPendingReset() {
  const storage = getStorage()
  const raw = storage.getItem(RESET_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (err) {
    return null
  }
}

export function clearPendingReset() {
  const storage = getStorage()
  storage.removeItem(RESET_KEY)
}

export async function signup(payload) {
  const res = await api.post('/auth/users/', payload)
  return res?.data ?? res
}

export async function requestPasswordReset(payload) {
  const email = payload?.email?.trim()
  const phone = payload?.phone?.trim()
  if (email) {
    const res = await api.post('/accounts/forgot-password/', { email })
    return res?.data ?? res
  }
  if (phone) {
    const res = await api.post('/accounts/forgot-password/', { phone })
    return res?.data ?? res
  }
  throw new Error('Email or phone is required')
}

export async function resetPassword(payload) {
  const body = {
    otp: payload?.otp,
    new_password: payload?.new_password,
    re_new_password: payload?.re_new_password
  }
  if (payload?.email) {
    body.email = payload.email
  }
  if (payload?.phone) {
    body.phone = payload.phone
  }
  const res = await api.post('/accounts/reset-password/', body)
  return res?.data ?? res
}

export async function verifyOtp(code) {
  const pending = getPendingSignup()
  if (!pending) throw new Error('Missing signup data')
  const res = await api.post('/accounts/otp-verify/', {
    code,
    email: pending.email,
    phone: pending.phone
  })
  const data = res?.data ?? res
  const token = data?.access || data?.token || `verified-${Date.now()}`
  saveSession({ token, user: { email: pending.email, phone: pending.phone } })
  clearPendingSignup()
  return data
}

export async function login({ email, password }) {
  const res = await api.post('/auth/jwt/create/', { email, password })
  const data = res?.data ?? res
  const token = data?.access || data?.token || data?.jwt
  if (!token) throw new Error('Missing token')
  const session = { token, refresh: data?.refresh || null, user: { email } }
  saveSession(session)
  return session
}

export async function logout() {
  const session = getSession()
  const refresh = session?.refresh
  if (refresh) {
    await api.post('/accounts/logout/', { refresh })
  }
  clearSession()
}

export async function resendActivation(payload) {
  const email = payload?.email?.trim()
  if (!email) throw new Error('Email is required')
  const res = await api.post('/accounts/resend-activation/', { email })
  return res?.data ?? res
}

export async function getUsers() {
  const res = await api.get('/auth/users/')
  return res?.data ?? res
}

export async function getCurrentUser() {
  return await api.get('/accounts/user/')
}

export default {
  login,
  logout,
  signup,
  verifyOtp,
  requestPasswordReset,
  resetPassword,
  resendActivation,
  getUsers,
  getCurrentUser,
  getSession,
  getToken,
  saveSession,
  clearSession,
  savePendingSignup,
  getPendingSignup,
  clearPendingSignup,
  savePendingReset,
  getPendingReset,
  clearPendingReset
}
