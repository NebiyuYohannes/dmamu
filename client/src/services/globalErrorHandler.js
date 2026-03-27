import toast from './toastService'

const GENERIC_MESSAGE = 'Something went wrong'
const DEDUPE_WINDOW_MS = 2000
let lastToast = { message: '', ts: 0 }

function safeGetDetail(data) {
  if (!data) return ''

  const messages = []

  // Non-field / general errors
  if (data.detail) {
    if (typeof data.detail === 'string') messages.push(data.detail)
    else if (Array.isArray(data.detail)) messages.push(...data.detail)
    else if (typeof data.detail === 'object' && data.detail !== null) {
      Object.values(data.detail).forEach(val => {
        if (Array.isArray(val)) messages.push(...val)
        else if (typeof val === 'string') messages.push(val)
      })
    }
  }

  // Field-level errors
  if (typeof data === 'object') {
    Object.entries(data).forEach(([key, val]) => {
      if (key === 'detail') return
      if (Array.isArray(val)) messages.push(...val)
      else if (typeof val === 'string') messages.push(val)
    })
  }

  return messages.join(', ')
}
export function handleApiError(error, options = {}) {
  try {
    const { showToast = true } = options
    const detail = safeGetDetail(error?.response?.data)
    const message = detail || GENERIC_MESSAGE

    if (showToast) {
      const now = Date.now()
      const isDuplicate = message === lastToast.message && (now - lastToast.ts) < DEDUPE_WINDOW_MS
      if (!isDuplicate) {
        toast.error(message)
        lastToast = { message, ts: now }
      }
    }
    return message
  } catch (err) {
    try {
      const now = Date.now()
      const isDuplicate = GENERIC_MESSAGE === lastToast.message && (now - lastToast.ts) < DEDUPE_WINDOW_MS
      if (!isDuplicate) {
        toast.error(GENERIC_MESSAGE)
        lastToast = { message: GENERIC_MESSAGE, ts: now }
      }
    } catch (noop) {
      // ignore toast failures
    }
    return GENERIC_MESSAGE
  }
}

export function attachGlobalErrorHandler(apiInstance) {
  if (!apiInstance?.interceptors?.response?.use) return apiInstance
  apiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      handleApiError(error)
      return Promise.reject(error)
    }
  )
  return apiInstance
}

export default {
  handleApiError,
  attachGlobalErrorHandler
}
