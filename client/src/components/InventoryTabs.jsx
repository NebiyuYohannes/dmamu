import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '../utils/cn'

const TABS = [
    { path: '/inventory', label: 'Warehouses' },
    { path: '/inventory/items', label: 'Items' },
    { path: '/inventory/stock-movements', label: 'Stock Movements' },
    { path: '/inventory/categories', label: 'Categories' },
]

export default function InventoryTabs() {
    const navigate = useNavigate()
    const location = useLocation()

    const currentPath = location.pathname.replace(/\/$/, '')

    function isActive(path) {
        return currentPath === path
    }

    return (
        <div className="flex flex-wrap gap-2">
            {TABS.map(({ path, label }) => (
                <button
                    key={path}
                    type="button"
                    onClick={() => {
                        if (!isActive(path)) navigate(path)
                    }}
                    className={cn(
                        'px-3 py-2 text-sm border rounded-lg transition-colors',
                        isActive(path)
                            ? 'bg-primary text-white border-primary'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    )
}