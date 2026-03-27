import React, { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import InventoryTabs from '../components/InventoryTabs'
import toast from '../services/toastService'

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

function movementTypeClass(type) {
  if (type === 'purchase') return 'text-green-600 bg-green-50 border-green-200'
  if (type === 'sale') return 'text-red-600 bg-red-50 border-red-200'
  if (type === 'adjustment') return 'text-blue-600 bg-blue-50 border-blue-200'
  return 'text-gray-700 bg-gray-50 border-gray-200'
}

export default function InventoryStockMovements() {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [ordering, setOrdering] = useState('-date')
  const [sortOpen, setSortOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editingMovement, setEditingMovement] = useState(null)
  const [detailMovement, setDetailMovement] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryOptions, setInventoryOptions] = useState([])
  const [selectedInventory, setSelectedInventory] = useState(null)
  const [purchaseOptions, setPurchaseOptions] = useState([])
  const [saleOptions, setSaleOptions] = useState([])

  function handleInventorySelect(value) {
    const found = inventoryOptions.find(opt => String(opt.id) === String(value)) || null
    setSelectedInventory(found)
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, ordering])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const svc = await import('../services/inventoryService')
        const res = await svc.getStockMovements({ page, search: debouncedSearch, ordering })
        const data = res?.data ?? res
        const list = Array.isArray(data) ? data : (data?.results ?? [])
        if (!mounted) return
        setMovements(list)
        if (data && !Array.isArray(data)) {
          setMeta({ count: data.count, next: data.next, previous: data.previous, pageSize: (data.results || []).length })
        } else {
          setMeta({ count: list.length, next: null, previous: null, pageSize: list.length })
        }
      } catch (err) {
        toast.error('Failed to load stock movements')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [debouncedSearch, ordering, page])

  useEffect(() => {
    let mounted = true
    const t = setTimeout(async () => {
      try {
        const svc = await import('../services/inventoryService')
        const res = await svc.getInventoryDropdown({ search: inventorySearch.trim() })
        const data = res?.data ?? res
        if (!mounted) return
        setInventoryOptions(Array.isArray(data) ? data : (data?.results ?? []))
      } catch (err) {
        if (mounted) setInventoryOptions([])
      }
    }, 300)
    return () => { mounted = false; clearTimeout(t) }
  }, [inventorySearch])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const svc = await import('../services/inventoryService')
        const [pRes, sRes] = await Promise.all([
          svc.getPurchaseDropdown(),
          svc.getSaleDropdown()
        ])
        if (!mounted) return
        setPurchaseOptions(pRes?.data ?? pRes ?? [])
        setSaleOptions(sRes?.data ?? sRes ?? [])
      } catch (err) {
        if (mounted) {
          setPurchaseOptions([])
          setSaleOptions([])
        }
      }
    })()
    return () => { mounted = false }
  }, [])

  async function openDetail(movement) {
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const svc = await import('../services/inventoryService')
      const res = await svc.getStockMovementDetail(movement.id)
      setDetailMovement(res?.data ?? res)
    } catch (err) {
      toast.error('Failed to load movement detail')
    } finally {
      setDetailLoading(false)
    }
  }

  function openEdit(movement) {
    setEditingMovement(movement)
    setEditModalOpen(true)
    setInventorySearch('')
  }

  async function handleDelete(movement) {
    const confirmed = window.confirm('If you delete this movement you will lose all related records')
    if (!confirmed) return
    try {
      toast.info('Deleting movement...')
      const svc = await import('../services/inventoryService')
      await svc.deleteStockMovement(movement.id)
      setMovements(prev => prev.filter(m => m.id !== movement.id))
      toast.success('Movement deleted')
    } catch (err) {
      toast.error('Failed to delete movement')
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const inventory = (fd.get('movementInventory') || '').toString().trim()
    const movementType = (fd.get('movementType') || '').toString().trim()
    const quantity = (fd.get('movementQuantity') || '').toString().trim()
    const notes = (fd.get('movementNotes') || '').toString().trim()
    const purchase = (fd.get('movementPurchase') || '').toString().trim()
    const sale = (fd.get('movementSale') || '').toString().trim()

    if (!inventory || !movementType || !quantity) {
      toast.error('Inventory, movement type, and quantity are required')
      return
    }

    const payload = {
      inventory: Number(inventory),
      movement_type: movementType,
      quantity: Number(quantity),
      notes: notes || '',
      purchase: purchase ? Number(purchase) : null,
      sale: sale ? Number(sale) : null
    }

    const selected = selectedInventory || inventoryOptions.find(opt => String(opt.id) === String(inventory))
    const optimisticItem = selected?.item_name || ''
    const optimisticWarehouse = selected?.warehouse_name || ''
    const reference = selected?.reference || ''

    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId,
      movement_type: movementType,
      item_name: optimisticItem,
      warehouse_name: optimisticWarehouse,
      reference,
      quantity: Number(quantity),
      date: new Date().toISOString(),
      optimistic: true
    }

    setMovements(prev => [optimistic, ...prev])
    setIsModalOpen(false)
    e.target.reset()

    try {
      toast.info('Creating movement...')
      const svc = await import('../services/inventoryService')
      const res = await svc.createStockMovement(payload)
      const created = res?.data ?? res
      setMovements(prev => prev.map(m => (m.id === tempId ? created : m)))
      toast.success('Movement created')
    } catch (err) {
      setMovements(prev => prev.filter(m => m.id !== tempId))
      toast.error('Failed to create movement')
      setIsModalOpen(true)
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editingMovement) return
    const fd = new FormData(e.target)
    const inventory = (fd.get('editMovementInventory') || '').toString().trim()
    const movementType = (fd.get('editMovementType') || '').toString().trim()
    const quantity = (fd.get('editMovementQuantity') || '').toString().trim()
    const notes = (fd.get('editMovementNotes') || '').toString().trim()
    const purchase = (fd.get('editMovementPurchase') || '').toString().trim()
    const sale = (fd.get('editMovementSale') || '').toString().trim()

    if (!inventory || !movementType || !quantity) {
      toast.error('Inventory, movement type, and quantity are required')
      return
    }

    const payload = {
      inventory: Number(inventory),
      movement_type: movementType,
      quantity: Number(quantity),
      notes: notes || '',
      purchase: purchase ? Number(purchase) : null,
      sale: sale ? Number(sale) : null
    }

    const prev = movements.find(m => m.id === editingMovement.id)
    if (!prev) return
    const optimistic = { ...prev, ...payload }
    setMovements(prevList => prevList.map(m => (m.id === optimistic.id ? optimistic : m)))
    setEditModalOpen(false)
    setEditingMovement(null)

    try {
      toast.info('Updating movement...')
      const svc = await import('../services/inventoryService')
      const res = await svc.updateStockMovement(optimistic.id, payload)
      const updated = res?.data ?? res
      setMovements(prevList => prevList.map(m => (m.id === updated.id ? { ...m, ...updated } : m)))
      toast.success('Movement updated')
    } catch (err) {
      setMovements(prevList => prevList.map(m => (m.id === prev.id ? prev : m)))
      toast.error('Failed to update movement')
      setEditingMovement(prev)
      setEditModalOpen(true)
    }
  }

  const filtered = useMemo(() => movements.slice(), [movements])

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-20 md:pb-0">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 md:ml-64">
          <div className="mb-8">
            <h2 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Stock Movements</h2>
            <p className="text-sm md:text-base text-gray-600">Track stock in, stock out, and transfers.</p>
          </div>

          <div className="mb-6">
            <InventoryTabs />
          </div>

          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div className="flex flex-row gap-2 sm:gap-3 items-center">
                <div className="relative flex-1">
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search movements..." className="pl-3 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full" />
                </div>
                <div className="relative sm:flex-initial">
                  <button onClick={(e) => { e.stopPropagation(); setSortOpen(v => !v) }} className="w-full sm:w-auto flex items-center justify-center gap-2 px-2 md:px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap !rounded-button">
                    <div className="w-4 h-4 flex items-center justify-center"><i className="ri-sort-desc"></i></div>
                    <span className="hidden sm:inline">Sort</span>
                    <div className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-down-s-line"></i></div>
                  </button>
                  {sortOpen && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="p-2">
                        {[
                          { k: '-date', l: 'Date (newest first)' },
                          { k: 'date', l: 'Date (oldest first)' },
                          { k: 'movement_type', l: 'Type (A → Z)' },
                          { k: '-movement_type', l: 'Type (Z → A)' },
                          { k: 'quantity', l: 'Quantity (low → high)' },
                          { k: '-quantity', l: 'Quantity (high → low)' }
                        ].map(opt => (
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
                <button onClick={() => { setIsModalOpen(true); setInventorySearch('') }} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm">Add Movement</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 md:p-6 mb-8 hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Item</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Warehouse</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Reference</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Quantity</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={7} className="p-6 text-center text-gray-500">Loading movements...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-gray-500">No movements found.</td></tr>
                  ) : (
                    filtered.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4"><p className="text-sm text-gray-700">{formatDate(m.date)}</p></td>
                        <td className="py-3 px-4">
                          <p className={`text-sm font-medium ${m.movement_type === 'purchase' ? 'text-green-600' : m.movement_type === 'sale' ? 'text-red-600' : m.movement_type === 'adjustment' ? 'text-blue-600' : 'text-gray-700'}`}>
                            {m.movement_type}
                          </p>
                        </td>
                        <td className="py-3 px-4"><p className="text-sm text-gray-900">{m.item_name}</p></td>
                        <td className="py-3 px-4"><p className="text-sm text-gray-700">{m.warehouse_name}</p></td>
                        <td className="py-3 px-4"><p className="text-sm text-gray-700">{m.reference || ''}</p></td>
                        <td className="py-3 px-4">
                          <p className={`text-sm font-medium ${m.movement_type === 'purchase' ? 'text-green-600' : m.movement_type === 'sale' ? 'text-red-600' : m.movement_type === 'adjustment' ? 'text-blue-600' : 'text-gray-900'}`}>
                            {m.quantity}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button onClick={(ev)=>{ ev.stopPropagation(); openDetail(m) }} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors !rounded-button" title="View Movement">
                              <div className="w-4 h-4 flex items-center justify-center"><i className="ri-eye-line"></i></div>
                            </button>
                            {/*<button onClick={(ev)=>{ ev.stopPropagation(); openEdit(m) }} className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors !rounded-button" title="Edit Movement">*/}
                            {/*  <div className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line"></i></div>*/}
                            {/*</button>*/}
                            {/*<button onClick={(ev)=>{ ev.stopPropagation(); handleDelete(m) }} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors !rounded-button" title="Delete Movement">*/}
                            {/*  <div className="w-4 h-4 flex items-center justify-center"><i className="ri-delete-bin-line"></i></div>*/}
                            {/*</button>*/}
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
              <div className="p-4 text-center text-gray-500">Loading movements...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No movements found.</div>
            ) : (
              filtered.map(m => (
                <div key={m.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-sm text-gray-900">{m.item_name}</h3>
                      <p className="text-xs text-gray-500">{m.warehouse_name}</p>
                    </div>
                    <span className={`text-sm font-semibold ${m.movement_type === 'purchase' ? 'text-green-600' : m.movement_type === 'sale' ? 'text-red-600' : m.movement_type === 'adjustment' ? 'text-blue-600' : 'text-gray-900'}`}>
                      {m.quantity}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Type: <span className={`${m.movement_type === 'purchase' ? 'text-green-600' : m.movement_type === 'sale' ? 'text-red-600' : m.movement_type === 'adjustment' ? 'text-blue-600' : 'text-gray-900'}`}>{m.movement_type}</span></div>
                    <div>Ref: <span className="text-gray-900">{m.reference || ''}</span></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{formatDate(m.date)}</div>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={(ev)=>{ ev.stopPropagation(); openDetail(m) }} className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
                      <i className="ri-eye-line mr-1"></i>View
                    </button>
                    <button onClick={(ev)=>{ ev.stopPropagation(); openEdit(m) }} className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
                      <i className="ri-edit-line mr-1"></i>Edit
                    </button>
                    <button onClick={(ev)=>{ ev.stopPropagation(); handleDelete(m) }} className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                      <i className="ri-delete-bin-line mr-1"></i>Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {(() => {
            const hasMeta = Boolean(meta && meta.count)
            const showPagination = Boolean(meta && meta.previous) || Boolean(meta && meta.next) || (hasMeta && meta.pageSize && meta.count > meta.pageSize)
            if (!showPagination) return null
            return (
              <div className="flex items-center justify-center mt-6 mb-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => { if (!(meta && meta.previous)) return; setPage(p => Math.max(1, p - 1)) }} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap !rounded-button" disabled={!(meta && meta.previous)} aria-disabled={!(meta && meta.previous)}>
                    <i className="ri-arrow-left-s-line"></i>
                    <span className="ml-1">Previous</span>
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600">Page {page}{meta && meta.count ? ' of ' + Math.max(1, Math.ceil(meta.count / (meta.pageSize || 1))) : ''}</span>
                  <button onClick={() => { if (!(meta && meta.next)) return; setPage(p => p + 1) }} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap !rounded-button" disabled={!(meta && meta.next)} aria-disabled={!(meta && meta.next)}>
                    <span className="mr-1">Next</span>
                    <i className="ri-arrow-right-s-line"></i>
                  </button>
                </div>
              </div>
            )
          })()}

          {detailOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Movement Detail</h3>
                      <p className="text-sm text-gray-500">Full movement information</p>
                    </div>
                    <button onClick={() => { setDetailOpen(false); setDetailMovement(null) }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <i className="ri-close-line"></i>
                    </button>
                  </div>
                  {detailLoading ? (
                    <div className="p-4 text-center text-gray-500">Loading detail...</div>
                  ) : detailMovement ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${movementTypeClass(detailMovement.movement_type)}`}>{detailMovement.movement_type}</span>
                        <span className="text-sm text-gray-600">{formatDate(detailMovement.date)}</span>
                        <span className={`text-sm font-semibold ${detailMovement.movement_type === 'purchase' ? 'text-green-600' : detailMovement.movement_type === 'sale' ? 'text-red-600' : detailMovement.movement_type === 'adjustment' ? 'text-blue-600' : 'text-gray-900'}`}>{detailMovement.quantity}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-lg border border-gray-100 p-3">
                          <div className="text-xs text-gray-500 mb-1">Item</div>
                          <div className="text-sm font-medium text-gray-900">{detailMovement.inventory?.item || ''}</div>
                        </div>
                        <div className="rounded-lg border border-gray-100 p-3">
                          <div className="text-xs text-gray-500 mb-1">Warehouse</div>
                          <div className="text-sm font-medium text-gray-900">{detailMovement.inventory?.warehouse || ''}</div>
                        </div>
                        <div className="rounded-lg border border-gray-100 p-3">
                          <div className="text-xs text-gray-500 mb-1">Current Stock</div>
                          <div className="text-sm font-medium text-gray-900">{detailMovement.inventory?.current_stock ?? ''}</div>
                        </div>
                        <div className="rounded-lg border border-gray-100 p-3">
                          <div className="text-xs text-gray-500 mb-1">Reference</div>
                          <div className="text-sm font-medium text-gray-900">
                            {detailMovement.purchase?.reference || detailMovement.sale?.reference || ''}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-100 p-3">
                        <div className="text-xs text-gray-500 mb-1">Notes</div>
                        <div className="text-sm text-gray-900">{detailMovement.notes || ''}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">No detail available.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {editModalOpen && editingMovement && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Edit Movement</h3>
                    <button onClick={() => { setEditModalOpen(false); setEditingMovement(null) }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <i className="ri-close-line"></i>
                    </button>
                  </div>
                  <form onSubmit={handleEditSubmit} id="editMovementForm">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Inventory</label>
                        <input value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} placeholder="Search inventory..." className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm mb-2" />
                        <select name="editMovementInventory" defaultValue={editingMovement.inventory || ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" onChange={(e) => handleInventorySelect(e.target.value)}>
                          <option value="">Select inventory</option>
                          {inventoryOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label || opt.name || opt.id}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Movement Type</label>
                        <select name="editMovementType" defaultValue={editingMovement.movement_type || ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm">
                          <option value="purchase">purchase</option>
                          <option value="sale">sale</option>
                          <option value="adjustment">adjustment</option>
                          {/*<option value="transfer">transfer</option>*/}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                        <input name="editMovementQuantity" defaultValue={editingMovement.quantity ?? ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter quantity" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea name="editMovementNotes" defaultValue={editingMovement.notes ?? ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Notes (optional)" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Purchase</label>
                        <select name="editMovementPurchase" defaultValue={editingMovement.purchase || ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm">
                          <option value="">None</option>
                          {purchaseOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sale</label>
                        <select name="editMovementSale" defaultValue={editingMovement.sale || ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm">
                          <option value="">None</option>
                          {saleOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button type="button" onClick={() => { setEditModalOpen(false); setEditingMovement(null) }} className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">Cancel</button>
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
                    <h3 className="text-xl font-bold text-gray-900">Add New Movement</h3>
                    <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <i className="ri-close-line"></i>
                    </button>
                  </div>
                  <form onSubmit={handleCreate} id="addMovementForm">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Inventory</label>
                        <input value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} placeholder="Search inventory..." className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm mb-2" />
                        <select name="movementInventory" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" onChange={(e) => handleInventorySelect(e.target.value)}>
                          <option value="">Select inventory</option>
                          {inventoryOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label || opt.name || opt.id}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Movement Type</label>
                        <select name="movementType" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm">
                          <option value="purchase">purchase</option>
                          <option value="sale">sale</option>
                          <option value="adjustment">adjustment</option>
                          {/*<option value="transfer">transfer</option>*/}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                        <input name="movementQuantity" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter quantity" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea name="movementNotes" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Notes (optional)" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Purchase</label>
                        <select name="movementPurchase" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm">
                          <option value="">None</option>
                          {purchaseOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sale</label>
                        <select name="movementSale" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm">
                          <option value="">None</option>
                          {saleOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">Cancel</button>
                      <button type="submit" className="flex-1 px-4 py-3 bg-primary text-white rounded-lg text-sm font-medium">Add Movement</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
