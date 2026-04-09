import React, { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import { getNotifications, getUnreadNotifications, markNotificationRead } from '../services/notificationService'
import toast from '../services/toastService'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '../utils/cn'
import { AlertCircle, ShoppingCart, DollarSign, Settings, Search, Check, ExternalLink, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'orders', label: 'Orders' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'finance', label: 'Finance' },
  { id: 'system', label: 'System' }
]

const typeConfig = {
  low_stock: {
    category: 'inventory',
    Icon: AlertCircle,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600'
  },
  order: {
    category: 'orders',
    Icon: ShoppingCart,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600'
  },
  finance: {
    category: 'finance',
    Icon: DollarSign,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600'
  },
  system: {
    category: 'system',
    Icon: Settings,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600'
  }
}

function formatTime(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  const yyyy = parsed.getFullYear()
  const mm = String(parsed.getMonth() + 1).padStart(2, '0')
  const dd = String(parsed.getDate()).padStart(2, '0')
  const hh = String(parsed.getHours()).padStart(2, '0')
  const min = String(parsed.getMinutes()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`
}

function mapNotification(item) {
  const config = typeConfig[item.type] || typeConfig.system
  return {
    id: item.id,
    category: config.category,
    unread: !item.is_read,
    title: item.type ? item.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Notification',
    message: item.message,
    detail: '',
    time: formatTime(item.created_at),
    Icon: config.Icon,
    iconBg: config.iconBg,
    iconColor: config.iconColor
  }
}

export default function Notifications() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading: loading } = useQuery({
    queryKey: ['notifications', activeTab, page, debouncedSearch],
    queryFn: async () => {
      const isUnread = activeTab === 'unread'
      const fetcher = isUnread ? getUnreadNotifications : getNotifications
      const params = {
        page,
        ...(isUnread || activeTab === 'all' ? {} : { source: activeTab }),
        ...(debouncedSearch ? { search: debouncedSearch } : {})
      }
      const res = await fetcher(params)
      return res?.data ?? res ?? {}
    },
    keepPreviousData: true,
    staleTime: 30 * 1000
  })

  const count = data?.count ?? 0
  const nextPageUrl = data?.next ?? null
  const prevPageUrl = data?.previous ?? null
  const rawItems = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
  const pageSize = data?.page_size ?? data?.pageSize ?? 10

  const items = useMemo(() => rawItems.map(mapNotification), [rawItems])

  const markMutator = useMutation({
    mutationFn: async (id) => markNotificationRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      const previous = queryClient.getQueryData(['notifications', activeTab, page, debouncedSearch])
      queryClient.setQueryData(['notifications', activeTab, page, debouncedSearch], (old) => {
        if (!old) return old
        const results = old.results?.map(n => n.id === id ? { ...n, is_read: true } : n) || old
        return { ...old, results }
      })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
      return { previous }
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications', activeTab, page, debouncedSearch], context.previous)
      }
      toast.error('Failed to mark as read')
    }
  })

  const handleAction = (item, action) => {
    if (action.type === 'markRead') {
      markMutator.mutate(item.id)
    }
  }

  const pageActions = (item) => {
    const actions = []
    if (item.category === 'inventory') {
      actions.push({ label: 'View Inventory', type: 'link', to: '/inventory', className: 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50', Icon: ExternalLink })
    }
    if (item.category === 'orders') {
      actions.push({ label: 'View Order', type: 'link', to: '/orders', className: 'text-primary bg-primary/5 border border-primary/20 hover:bg-primary/10', Icon: ExternalLink })
    }
    if (item.category === 'finance') {
      actions.push({ label: 'View Details', type: 'link', to: '/finance', className: 'text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100', Icon: ExternalLink })
    }
    if (item.unread) {
      actions.push({ label: 'Mark as Read', type: 'markRead', className: 'text-gray-600 bg-gray-100 border border-transparent hover:bg-gray-200', Icon: Check })
    }
    return actions
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pt-20 pb-20 md:pb-0">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 md:ml-64 w-full transition-all duration-300">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 border-b-2 border-primary inline-block pb-1">Notifications</h2>
            <p className="text-gray-500 text-sm mt-2">
              Stay updated with your business activities and important alerts.
            </p>
          </div>

          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
              <div className="flex space-x-1 overflow-x-auto custom-scrollbar pb-2 md:pb-0 flex-nowrap">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setPage(1)
                      setActiveTab(tab.id)
                    }}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors",
                      activeTab === tab.id
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-72">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="text-gray-400" size={16} />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search notifications..."
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
               <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const actions = pageActions(item)
                const ItemIcon = item.Icon
                return (
                  <div
                    key={item.id}
                    className={cn("bg-white rounded-xl border shadow-sm p-4 md:p-5 transition-all", item.unread ? 'border-primary/20 ring-1 ring-primary/10 shadow-md' : 'border-gray-100 hover:border-gray-200')}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", item.iconBg)}>
                        <ItemIcon className={item.iconColor} size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 mb-1">
                          <h3 className="text-sm font-bold text-gray-900 truncate">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.unread && <span className="w-2 h-2 bg-primary rounded-full mt-0.5"></span>}
                            <span className="text-xs font-semibold text-gray-400">{item.time}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed mb-3">
                          {item.message}
                        </p>

                        {actions.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {actions.map((action, idx) => {
                              const ActionIcon = action.Icon
                              if (action.type === 'link') {
                                return (
                                  <Link
                                    key={idx}
                                    to={action.to}
                                    className={cn(action.className, "px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors")}
                                  >
                                    {ActionIcon && <ActionIcon size={12} strokeWidth={2.5} />}
                                    {action.label}
                                  </Link>
                                )
                              }
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleAction(item, action)}
                                  className={cn(action.className, "px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors")}
                                >
                                  {ActionIcon && <ActionIcon size={12} strokeWidth={2.5} />}
                                  {action.label}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {!items.length && (
                <div className="text-center p-12 bg-white/50 rounded-2xl border border-dashed border-gray-200">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="text-gray-400" size={24} />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">All caught up!</h3>
                  <p className="text-xs text-gray-500">You don't have any notifications right now.</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {(() => {
            const hasMeta = Boolean(count)
            const showPagination = Boolean(prevPageUrl) || Boolean(nextPageUrl) || (hasMeta && pageSize && count > pageSize)
            if (!showPagination) return null
            return (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500 hidden sm:block font-medium">
                   Showing total {count} updates
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <button
                    onClick={() => { if (prevPageUrl) setPage(p => Math.max(1, p - 1)) }}
                    className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    disabled={!prevPageUrl}
                  >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:block">Prev</span>
                  </button>
                  <button
                    onClick={() => { if (nextPageUrl) setPage(p => p + 1) }}
                    className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    disabled={!nextPageUrl}
                  >
                    <span className="hidden sm:block">Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )
          })()}
        </main>
      </div>
    </div>
  )
}
