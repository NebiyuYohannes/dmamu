import React, { useEffect, useMemo, useState } from 'react'
import toast from '../services/toastService'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import { useNavigate } from 'react-router-dom'

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [currentFilter, setCurrentFilter] = useState('all')
  const [currentSort, setCurrentSort] = useState('-created_at')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [meta, setMeta] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => { setCurrentPage(1) }, [debouncedQuery, currentSort])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const svc = await import('../services/supplierService')
        const data = await svc.getSuppliers({ page: currentPage, search: debouncedQuery, ordering: currentSort })
        const list = Array.isArray(data) ? data : (data?.results ?? [])
        const mapped = (list || []).map(d => ({ id: d.id, name: d.name, phone: d.phone, address: d.address || '', products: d.products || d.products_count || 0, balance: d.balance || 0 }))
        if (!mounted) return
        setSuppliers(mapped)
        if (data && !Array.isArray(data)) setMeta({ count: data.count, next: data.next, previous: data.previous, pageSize: (data.results || []).length })
        else setMeta({ count: mapped.length, next: null, previous: null, pageSize: mapped.length })
      } catch (err) {
        toast.error('Failed to load suppliers')
      } finally { if (mounted) setLoading(false) }
    })()
    return () => { mounted = false }
  }, [currentPage, debouncedQuery, currentSort])

  const filtered = useMemo(() => {
    let list = suppliers.slice()
    if (query.trim()) { const q = query.toLowerCase(); list = list.filter(s => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q) || s.phone.includes(q)) }
    // Basic client-side sorting fallback for name/balance; created_at ordering relies on backend response
    switch (currentSort) {
      case 'name': list.sort((a,b)=>a.name.localeCompare(b.name)); break
      case '-name': list.sort((a,b)=>b.name.localeCompare(a.name)); break
      case 'balance': list.sort((a,b)=>a.balance - b.balance); break
      case '-balance': list.sort((a,b)=>b.balance - a.balance); break
      default: break
    }
    return list
  }, [suppliers, query, currentSort])

  function openProfile(id) { navigate(`/suppliers/supplier/${id}`) }

  function openEdit(supplier) {
    setEditingSupplier(supplier)
    setEditModalOpen(true)
  }

  async function handleDelete(supplier) {
    const confirmed = window.confirm('If you delete this supplier you will lose all related records')
    if (!confirmed) return
    try {
      toast.info('Deleting supplier...')
      const svc = await import('../services/supplierService')
      await svc.deleteSupplier(supplier.id)
      setSuppliers(p => p.filter(s => s.id !== supplier.id))
      toast.success('Supplier deleted')
    } catch (err) {
      toast.error('Failed to delete supplier')
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const name = (fd.get('supplierName')||'').toString()
    const phone = (fd.get('supplierPhone')||'').toString()
    const address = (fd.get('supplierAddress')||'').toString()
    if (!name.trim() || !phone.trim() || !address.trim()) { toast.error('Name, phone and address are required'); return }
    try {
      toast.info('Creating supplier...')
      const svc = await import('../services/supplierService')
      const created = await svc.createSupplier({ name: name.trim(), phone: phone.trim(), address: address.trim() })
      setSuppliers(p => [{ id: created.id, name: created.name, phone: created.phone, address: created.address || '', products: created.products || 0, balance: created.balance || 0 }, ...p])
      toast.success('Supplier created')
      setIsModalOpen(false)
      e.target.reset()
    } catch (err) {
      toast.error('Failed to create supplier')
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editingSupplier) return
    const fd = new FormData(e.target)
    const name = (fd.get('editSupplierName')||'').toString()
    const phone = (fd.get('editSupplierPhone')||'').toString()
    const address = (fd.get('editSupplierAddress')||'').toString()
    if (!name.trim() || !phone.trim() || !address.trim()) { toast.error('Name, phone and address are required'); return }
    try {
      toast.info('Updating supplier...')
      const svc = await import('../services/supplierService')
      const updated = await svc.updateSupplier(editingSupplier.id, { name: name.trim(), phone: phone.trim(), address: address.trim() })
      setSuppliers(p => p.map(s => s.id === updated.id ? { ...s, name: updated.name, phone: updated.phone, address: updated.address || '' } : s))
      toast.success('Supplier updated')
      setEditModalOpen(false)
      setEditingSupplier(null)
    } catch (err) {
      toast.error('Failed to update supplier')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 md:ml-64">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Suppliers</h2>
            <p className="text-gray-600">Manage suppliers and track purchase history.</p>
          </div>

          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div className="flex flex-row gap-2 sm:gap-3 items-center">
                <div className="relative flex-1">
                  <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search suppliers..." className="pl-3 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full" />
                </div>
                <div className="relative sm:flex-initial">
                  <button onClick={(e)=>{ e.stopPropagation(); setSortOpen(v=>!v); setFilterOpen(false)}} className="w-full sm:w-auto flex items-center justify-center gap-2 px-2 md:px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap !rounded-button">
                    <div className="w-4 h-4 flex items-center justify-center"><i className="ri-sort-desc"></i></div>
                    <span className="hidden xs:inline sm:inline">Sort</span>
                    <div className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-down-s-line"></i></div>
                  </button>
                  {sortOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="p-2">
                        {[
                          { "k": "name", "l": "Name (A → Z)" },
                          { "k": "-name", "l": "Name (Z → A)" },
                          { "k": "created_at", "l": "Created (oldest first)" },
                          { "k": "-created_at", "l": "Created (newest first)" },
                          { "k": "balance", "l": "Balance (low → high)" },
                          { "k": "-balance", "l": "Balance (high → low)" },
                          { "k": "products", "l": "Products (fewest → most)" },
                          { "k": "-products", "l": "Products (most → fewest)" },
                          { "k": "address", "l": "Address (A → Z)" },
                          { "k": "-address", "l": "Address (Z → A)" },
                          { "k": "latest_purchase", "l": "Latest Purchase (oldest first)" },
                          { "k": "-latest_purchase", "l": "Latest Purchase (newest first)" }
                        ].map(opt => (
                          <button key={opt.k} onClick={(ev)=>{ ev.stopPropagation(); setCurrentSort(opt.k); setSortOpen(false)}} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 md:p-6 mb-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Supplier</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Phone</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Address</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Products</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Balance</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={6} className="p-6 text-center text-gray-500">Loading suppliers...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">No suppliers found.</td></tr>
                  ) : (
                    filtered.map((s, idx) => (
                      <tr key={s.id ?? idx} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4"><a onClick={()=>openProfile(s.id)} className="font-medium text-gray-900 hover:text-primary cursor-pointer">{s.name}</a></td>
                        <td className="py-3 px-4"><p className="text-sm text-gray-500">{s.phone}</p></td>
                        <td className="py-3 px-4"><p className="text-sm text-gray-900">{s.address}</p></td>
                        <td className="py-3 px-4"><p className="text-sm text-gray-900">{s.products}</p></td>
                        <td className="py-3 px-4"><p className={"font-semibold " + (s.balance >= 0 ? 'text-green-600' : 'text-red-600')}>{'$'+Number(s.balance).toLocaleString()}</p></td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button onClick={(ev)=>{ ev.stopPropagation(); openEdit(s) }} className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors !rounded-button" title="Edit Supplier">
                              <div className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line"></i></div>
                            </button>
                            <button onClick={(ev)=>{ ev.stopPropagation(); handleDelete(s) }} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors !rounded-button" title="Delete Supplier">
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

          {(() => {
            const hasMeta = Boolean(meta && meta.count)
            const showPagination = Boolean(meta && meta.previous) || Boolean(meta && meta.next) || (hasMeta && meta.pageSize && meta.count > meta.pageSize)
            if (!showPagination) return null
            return (
              <div className="flex items-center justify-center mt-6 mb-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => { if (!(meta && meta.previous)) return; setCurrentPage(p => Math.max(1, p - 1)) }} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap !rounded-button" disabled={!(meta && meta.previous)} aria-disabled={!(meta && meta.previous)}>
                    <i className="ri-arrow-left-s-line"></i>
                    <span className="ml-1">Previous</span>
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600">Page {currentPage}{meta && meta.count ? ' of ' + Math.max(1, Math.ceil(meta.count / (meta.pageSize || 1))) : ''}</span>
                  <button onClick={() => { if (!(meta && meta.next)) return; setCurrentPage(p => p + 1) }} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap !rounded-button" disabled={!(meta && meta.next)} aria-disabled={!(meta && meta.next)}>
                    <span className="mr-1">Next</span>
                    <i className="ri-arrow-right-s-line"></i>
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Edit Supplier Modal */}
          {editModalOpen && editingSupplier && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Edit Supplier</h3>
                    <button onClick={()=>{ setEditModalOpen(false); setEditingSupplier(null) }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><i className="ri-close-line"></i></button>
                  </div>
                  <form onSubmit={handleEditSubmit} id="editSupplierForm">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Name</label>
                        <input name="editSupplierName" required defaultValue={editingSupplier.name || ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter supplier name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                        <input name="editSupplierPhone" required defaultValue={editingSupplier.phone || ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter phone number" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <input name="editSupplierAddress" required defaultValue={editingSupplier.address || ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter address" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button type="button" onClick={()=>{ setEditModalOpen(false); setEditingSupplier(null) }} className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">Cancel</button>
                      <button type="submit" className="flex-1 px-4 py-3 bg-primary text-white rounded-lg text-sm font-medium">Save Changes</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Add Supplier Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Add New Supplier</h3>
                    <button onClick={()=>setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><i className="ri-close-line"></i></button>
                  </div>
                  <form onSubmit={handleCreate} id="addSupplierForm">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Name</label>
                        <input name="supplierName" required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter supplier name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                        <input name="supplierPhone" required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter phone number" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <input name="supplierAddress" required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter address" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button type="button" onClick={()=>setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">Cancel</button>
                      <button type="submit" className="flex-1 px-4 py-3 bg-primary text-white rounded-lg text-sm font-medium">Add Supplier</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
          <div
              className="fixed right-6 flex flex-col gap-3 z-30 bottom-[75px] md:bottom-6"
          >
            <button
                onClick={() => setIsModalOpen(true)}
                className="w-16 h-16 bg-white hover:bg-white text-primary rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center group whitespace-nowrap border-2 border-primary/20 hover:border-primary/40 hover:scale-110 active:scale-95"
            >
              <i
                  className="ri-add-line ri-2x group-hover:rotate-180 transition-transform duration-300 font-bold"
              ></i>
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
