import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="bg-white/90 backdrop-blur border border-gray-100 shadow-2xl rounded-2xl p-8 md:p-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
            <img src="/logo.png" alt="HabsifyLogo" className="w-12 h-12" />
          </div>
          <p className="text-sm text-gray-500 mb-2">Error 404</p>
          <h1 className="text-3xl font-['Roboto'] font-black text-primary mb-3">Page not found</h1>
          <p className="text-gray-600 text-base mb-6">The page you&apos;re looking for doesn&apos;t exist or was moved.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-3 !rounded-button whitespace-nowrap bg-primary text-white text-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

