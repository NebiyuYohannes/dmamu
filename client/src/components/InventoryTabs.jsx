import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function InventoryTabs() {
  const navigate = useNavigate()
  const location = useLocation()

  function isActiveTab(path) {
    return location.pathname === path || location.pathname === `${path}/`
  }

  function tabClass(path) {
    return `px-3 py-2 text-sm border rounded-lg ${isActiveTab(path) ? 'bg-primary text-white border-primary' : 'border-gray-200 hover:bg-gray-50'}`
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => navigate('/inventory')} className={tabClass('/inventory')}>Warehouses</button>
      <button type="button" onClick={() => navigate('/inventory/items/')} className={tabClass('/inventory/items')}>Items</button>
      <button type="button" onClick={() => navigate('/inventory/stock-movements/')} className={tabClass('/inventory/stock-movements')}>Stock Movements</button>
      <button type="button" onClick={() => navigate('/inventory/categories/')} className={tabClass('/inventory/categories')}>Categories</button>
    </div>
  )
}

