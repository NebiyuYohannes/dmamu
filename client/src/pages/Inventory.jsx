import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import InventoryTab from '../components/InventoryTabs'
import toast from '../services/toastService'

function formatCurrency(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Inventory() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [nextPageUrl, setNextPageUrl] = useState(null)
  const [prevPageUrl, setPrevPageUrl] = useState(null)
  const [pageSize, setPageSize] = useState(0)
  const [sortOpen, setSortOpen] = useState(false)
  const [ordering, setOrdering] = useState('name')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const svc = await import('../services/inventoryService')
        const res = await svc.getWarehouses({ search: debouncedSearch, ordering, page })
        const data = res?.data ?? res
        if (!mounted) return
        // paginated response: { count, next, previous, results }
        setCount(data?.count ?? 0)
        setNextPageUrl(data?.next ?? null)
        setPrevPageUrl(data?.previous ?? null)
        // compute page size from backend if provided or fallback to results length
        const ps = data?.page_size ?? data?.pageSize ?? (Array.isArray(data?.results) ? data.results.length : (Array.isArray(data) ? data.length : 0))
        setPageSize(ps || 0)
        setItems(Array.isArray(data) ? data : (data?.results ?? []))
      } catch (err) {
        toast.error('Failed to load warehouses')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [debouncedSearch, ordering, page])

  // Reset to first page when search or ordering changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, ordering])

  const filtered = useMemo(() => items.slice(), [items])

  function openDetail(item) {
    navigate(`/inventory/${item.id}`, { state: { warehouse: item } })
  }

  function openEdit(warehouse) {
    setEditingWarehouse(warehouse)
    setEditModalOpen(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const name = (fd.get('itemName') || '').toString().trim()
    const address = (fd.get('itemLocation') || '').toString().trim()
    if (!name || !address) {
      toast.error('Name and address are required')
      return
    }
    const tempId = `temp-${Date.now()}`
    const optimistic = { id: tempId, name, address, total_stock: 0, total_worth: '$0.00', optimistic: true }
    setItems((prev) => [optimistic, ...prev])
    setIsModalOpen(false)
    e.target.reset()
    try {
      toast.info('Creating warehouse...')
      const svc = await import('../services/inventoryService')
      const res = await svc.createWarehouse({ name, address })
      const created = res?.data ?? res
      const merged = {
        ...optimistic,
        ...created,
        total_stock: created?.total_stock ?? optimistic.total_stock ?? 0,
        total_worth: created?.total_worth ?? optimistic.total_worth ?? '$0.00'
      }
      // Replace optimistic item with server response (preserve stock/worth defaults if missing)
      setItems((prev) => prev.map((it) => (it.id === tempId ? merged : it)))
      toast.success('Warehouse created')
    } catch (err) {
      // Remove optimistic item on failure
      setItems((prev) => prev.filter((it) => it.id !== tempId))
      toast.error('Failed to create warehouse')
      // Optionally re-open modal so user can retry
      setIsModalOpen(true)
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editingWarehouse) return
    const fd = new FormData(e.target)
    const name = (fd.get('editWarehouseName') || '').toString().trim()
    const address = (fd.get('editWarehouseAddress') || '').toString().trim()
    if (!name || !address) {
      toast.error('Name and address are required')
      return
    }
    // Optimistic update: apply changes immediately and rollback on error
    const prev = items.find((w) => w.id === editingWarehouse.id)
    if (!prev) return
    const optimisticUpdate = { ...prev, name, address }
    setItems((prevList) => prevList.map((w) => (w.id === optimisticUpdate.id ? optimisticUpdate : w)))
    setEditModalOpen(false)
    setEditingWarehouse(null)
    try {
      toast.info('Updating warehouse...')
      const svc = await import('../services/inventoryService')
      const res = await svc.updateWarehouse(optimisticUpdate.id, { name, address })
      const updated = res?.data ?? res
      setItems((prevList) => prevList.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)))
      toast.success('Warehouse updated')
    } catch (err) {
      // rollback
      setItems((prevList) => prevList.map((w) => (w.id === prev.id ? prev : w)))
      toast.error('Failed to update warehouse')
      // optionally reopen edit modal with previous values
      setEditingWarehouse(prev)
      setEditModalOpen(true)
    }
  }

  async function handleDelete(warehouse) {
    const confirmed = window.confirm('If you delete this warehouse you lost all stock products')
    if (!confirmed) return
    try {
      toast.info('Deleting warehouse...')
      const svc = await import('../services/inventoryService')
      await svc.deleteWarehouse(warehouse.id)
      setItems((prev) => prev.filter((w) => w.id !== warehouse.id))
      toast.success('Warehouse deleted')
    } catch (err) {
      toast.error('Failed to delete warehouse')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-20 md:pb-0">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 md:ml-64">
          <div className="mb-8">
            <h2 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Inventory Management</h2>
            <p className="text-sm md:text-base text-gray-600">Track stock levels, manage products, and monitor inventory movements across your warehouse.</p>
          </div>

          <div className="mb-6">
            <InventoryTab />
          </div>

          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div className="flex flex-row gap-2 sm:gap-3 items-center">
                <div className="relative flex-1">
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search warehouses..." className="pl-3 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full" />
                </div>

                <div className="relative sm:flex-initial">
                  <button onClick={(e) => { e.stopPropagation(); setSortOpen(v => !v) }} className="w-full sm:w-auto flex items-center justify-center gap-2 px-2 md:px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap !rounded-button">
                    <div className="w-4 h-4 flex items-center justify-center"><i className="ri-sort-desc"></i></div>
                    <span className="hidden sm:inline">Sort</span>
                    <div className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-down-s-line"></i></div>
                  </button>
                  {sortOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="p-2">
                        {[
                          { k: 'name', l: 'Name (A → Z)' },
                          { k: '-name', l: 'Name (Z → A)' },
                          { k: 'created_at', l: 'Created (oldest first)' },
                          { k: '-created_at', l: 'Created (newest first)' },
                          { k: 'current_stock', l: 'Current Stock (low → high)' },
                          { k: '-current_stock', l: 'Current Stock (high → low)' },
                          { k: 'total_worth', l: 'Total Worth (low → high)' },
                          { k: '-total_worth', l: 'Total Worth (high → low)' },
                          { k: 'address', l: 'Address (A → Z)' },
                          { k: '-address', l: 'Address (Z → A)' },
                          { k: 'item_count', l: 'Item Count (fewest → most)' },
                          { k: '-item_count', l: 'Item Count (most → fewest)' }
                        ].map((opt) => (
                          <button key={opt.k} onClick={(ev) => { ev.stopPropagation(); setOrdering(opt.k); setSortOpen(false) }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm">Add Warehouse</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 md:p-6 mb-8 hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-2 md:py-3 lg:py-4 px-2 md:px-3 lg:px-6 text-xs md:text-sm font-semibold text-gray-900">Name</th>
                    <th className="text-left py-2 md:py-3 lg:py-4 px-1 md:px-3 lg:px-6 text-xs md:text-sm font-semibold text-gray-900 hidden sm:table-cell">Address</th>
                    <th className="text-left py-2 md:py-3 lg:py-4 px-1 md:px-3 lg:px-6 text-xs md:text-sm font-semibold text-gray-900">Total Stock</th>
                    <th className="text-left py-2 md:py-3 lg:py-4 px-2 md:px-3 lg:px-6 text-xs md:text-sm font-semibold text-gray-900">Total Worth</th>
                    <th className="text-left py-2 md:py-3 lg:py-4 px-2 md:px-3 lg:px-6 text-xs md:text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={5} className="p-6 text-center text-gray-500">Loading warehouses...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-gray-500">No warehouses found.</td></tr>
                  ) : (
                    filtered.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2 md:py-3 lg:py-4 px-2 md:px-3 lg:px-6">
                          <div>
                            <a onClick={() => openDetail(item)} className="cursor-pointer">
                              <p className="font-medium text-xs md:text-sm text-gray-900 hover:text-primary transition-colors">{item.name}</p>
                            </a>
                            <p className="text-xs text-gray-500 mt-1 sm:hidden">{item.address}</p>
                          </div>
                        </td>
                        <td className="py-2 md:py-3 lg:py-4 px-1 md:px-3 lg:px-6 hidden sm:table-cell">
                          <p className="text-xs md:text-sm text-gray-900">{item.address}</p>
                        </td>
                        <td className="py-2 md:py-3 lg:py-4 px-1 md:px-3 lg:px-6">
                          <span className="text-xs md:text-sm text-gray-900 font-medium">{item.total_stock}</span>
                        </td>
                        <td className="py-2 md:py-3 lg:py-4 px-2 md:px-3 lg:px-6">
                          <p className={`text-xs md:text-sm font-medium ${String(item.total_worth || '').includes('$') ? (item.total_worth === '$0.00' ? 'text-gray-900' : 'text-green-600') : 'text-gray-900'}`}>{formatCurrency(item.total_worth)}</p>
                        </td>
                        <td className="py-2 md:py-3 lg:py-4 px-2 md:px-3 lg:px-6">
                          <div className="flex items-center gap-2">
                            <button onClick={(ev)=>{ ev.stopPropagation(); openEdit(item) }} className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors !rounded-button" title="Edit Warehouse">
                              <div className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line"></i></div>
                            </button>
                            <button onClick={(ev)=>{ ev.stopPropagation(); handleDelete(item) }} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors !rounded-button" title="Delete Warehouse">
                              <div className="w-4 h-4 flex items-center justify-center"><i className="ri-delete-bin-line"></i></div>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-4 mt-4">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading inventory...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No inventory found.</div>
            ) : (
              filtered.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <a onClick={() => openDetail(item)} className="cursor-pointer">
                      <h3 className="font-medium text-sm text-gray-900 hover:text-primary transition-colors">{item.name}</h3>
                    </a>
                    <span className={`text-lg font-bold ${String(item.total_worth || '').includes('$') ? (item.total_worth === '$0.00' ? 'text-gray-900' : 'text-green-600') : 'text-gray-900'}`}>{formatCurrency(item.total_worth)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <i className="ri-map-pin-line w-3 h-3"></i>
                      {item.address}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="ri-archive-line w-3 h-3"></i>
                      {item.total_stock} items
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={(ev)=>{ ev.stopPropagation(); openEdit(item) }} className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
                      <i className="ri-edit-line mr-1"></i>Edit
                    </button>
                    <button onClick={(ev)=>{ ev.stopPropagation(); handleDelete(item) }} className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                      <i className="ri-delete-bin-line mr-1"></i>Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {editModalOpen && editingWarehouse && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Edit Warehouse</h3>
                    <button onClick={() => { setEditModalOpen(false); setEditingWarehouse(null) }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><i className="ri-close-line"></i></button>
                  </div>
                  <form onSubmit={handleEditSubmit} id="editWarehouseForm">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse Name</label>
                        <input name="editWarehouseName" required defaultValue={editingWarehouse.name || ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter warehouse name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <input name="editWarehouseAddress" required defaultValue={editingWarehouse.address || ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter address" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button type="button" onClick={() => { setEditModalOpen(false); setEditingWarehouse(null) }} className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">Cancel</button>
                      <button type="submit" className="flex-1 px-4 py-3 bg-primary text-white rounded-lg text-sm font-medium">Save Changes</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Add New Warehouse</h3>
                    <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><i className="ri-close-line"></i></button>
                  </div>
                  <form onSubmit={handleCreate} id="addInventoryForm">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse Name</label>
                        <input name="itemName" required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter warehouse name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <input name="itemLocation" required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter city name" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">Cancel</button>
                      <button type="submit" className="flex-1 px-4 py-3 bg-primary text-white rounded-lg text-sm font-medium">Save</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
          {(() => {
            // show pagination only if there is a count and either next/previous links exist
            const hasMeta = Boolean(count)
            // show pagination only if previous/next links exist OR if backend provided a pageSize and count > pageSize
            const showPagination = Boolean(prevPageUrl) || Boolean(nextPageUrl) || (hasMeta && pageSize && count > pageSize)
            if (!showPagination) return null
            return (
              <div className="flex items-center justify-center mt-6 mb-4">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => {
                      if (!prevPageUrl) return
                      console.debug('Inventory: prevPageUrl click', { prevPageUrl, page })
                      try {
                        const u = new URL(prevPageUrl, window.location.origin)
                        const p = Number(u.searchParams.get('page') || 1)
                        console.debug('Inventory: parsed prev page', p)
                        setPage(Number.isFinite(p) ? Math.max(1, p) : (page > 1 ? page - 1 : 1))
                      } catch (e) {
                        console.debug('Inventory: prev parse failed, fallback', e)
                        setPage(p => Math.max(1, p - 1))
                      }
                    }} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap !rounded-button" disabled={!prevPageUrl} aria-disabled={!prevPageUrl}>
                    <i className="ri-arrow-left-s-line"></i>
                    <span className="ml-1">Previous</span>
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600">Page {page}{count ? ' of ' + Math.max(1, Math.ceil(count / (pageSize || 1))) : ''}</span>
                  <button type="button" onClick={() => {
                      if (!nextPageUrl) return
                      console.debug('Inventory: nextPageUrl click', { nextPageUrl, page })
                      try {
                        const u = new URL(nextPageUrl, window.location.origin)
                        const p = Number(u.searchParams.get('page') || (page + 1))
                        console.debug('Inventory: parsed next page', p)
                        setPage(Number.isFinite(p) ? p : (page + 1))
                      } catch (e) {
                        console.debug('Inventory: next parse failed, fallback', e)
                        setPage(p => p + 1)
                      }
                    }} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap !rounded-button" disabled={!nextPageUrl} aria-disabled={!nextPageUrl}>
                    <span className="mr-1">Next</span>
                    <i className="ri-arrow-right-s-line"></i>
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
