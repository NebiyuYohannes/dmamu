import React, { useEffect, useMemo, useState } from 'react'
import toast from '../services/toastService'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

function formatCurrency(v) {
  const sign = v < 0 ? '-' : ''
  return sign + '$' + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CRM() {
  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [currentFilter, setCurrentFilter] = useState('all')
  const [currentSort, setCurrentSort] = useState('-created_at')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [currentPageCustomers, setCurrentPageCustomers] = useState(1)
  const [customersMeta, setCustomersMeta] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    function onDoc(e) {
      // close dropdowns if clicked outside (simple global close)
      // In a larger app you'd scope this with refs
      if (filterOpen || sortOpen) {
        setFilterOpen(false)
        setSortOpen(false)
      }
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [filterOpen, sortOpen])

  // Debounce search input so we don't spam API
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPageCustomers(1)
  }, [debouncedQuery, currentSort])

  // Load customers from API when page/search/sort change
  useEffect(() => {
    let mounted = true
    async function loadCustomers() {
      setLoadingCustomers(true)
      try {
        const svc = await import('../services/crmService')
        const data = await svc.getCustomers({ page: currentPageCustomers, search: debouncedQuery, ordering: currentSort })
        const list = Array.isArray(data) ? data : (data?.results ?? [])
        const mapped = (list || []).map(d => ({
          id: d.id,
          name: d.name,
          phone: d.phone,
          city: d.address || d.city || '',
          products: d.products_count != null ? d.products_count : (d.products || 0),
          balance: d.balance != null ? d.balance : 0
        }))
        if (mounted) {
          setCustomers(mapped.length ? mapped : [])
          if (data && !Array.isArray(data)) {
            setCustomersMeta({ count: data.count, next: data.next, previous: data.previous, pageSize: (data.results || []).length })
          } else {
            setCustomersMeta({ count: mapped.length, next: null, previous: null, pageSize: mapped.length })
          }
        }
      } catch (err) {
        if (mounted) toast.error('Failed to load customers')
      } finally {
        if (mounted) setLoadingCustomers(false)
      }
    }
    loadCustomers()
    return () => { mounted = false }
  }, [currentPageCustomers, debouncedQuery, currentSort])

  // navigate to profile page (no popup)
  function openProfile(customerId) {
    navigate(`/crm/customer/${customerId}`)
  }

  function openEdit(customer) {
    setEditingCustomer(customer)
    setEditModalOpen(true)
  }

  async function handleDelete(customer) {
    const confirmed = window.confirm('If you delete this customer you will lose all related records')
    if (!confirmed) return
    try {
      toast.info('Deleting customer...')
      const svc = await import('../services/crmService')
      await svc.deleteCustomer(customer.id)
      setCustomers(prev => prev.filter(c => c.id !== customer.id))
      toast.success('Customer deleted')
    } catch (err) {
      toast.error('Failed to delete customer')
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const payload = {
      name: (fd.get('editName')||'').toString().trim(),
      phone: (fd.get('editPhone')||'').toString().trim(),
      address: (fd.get('editAddress')||'').toString().trim(),
      notes: (fd.get('editNotes')||'').toString().trim()
    }
    const errors = {}
    if (!payload.name) errors.name = 'Name is required'
    if (!payload.phone) errors.phone = 'Phone is required'
    if (!payload.address) errors.address = 'Address is required'
    if (Object.keys(errors).length) {
      // simple UI feedback via toasts
      toast.error(Object.values(errors).join(' | '))
      return
    }

    try {
      toast.info('Saving changes...')
      const svc = await import('../services/crmService')
      const updated = await svc.updateCustomer(editingCustomer.id, payload)
      // update in local state
      setCustomers(prev => prev.map(c => c.id === updated.id ? ({
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        city: updated.address || '',
        products: updated.products_count || 0,
        balance: updated.balance || 0
      }) : c))
      toast.success('Customer updated')
      setEditModalOpen(false)
      setEditingCustomer(null)
    } catch (err) {
      const respErr = err?.response?.data
      if (respErr && typeof respErr === 'object') {
        const srvErrors = []
        if (respErr.name) srvErrors.push(Array.isArray(respErr.name) ? respErr.name.join(' ') : String(respErr.name))
        if (respErr.phone) srvErrors.push(Array.isArray(respErr.phone) ? respErr.phone.join(' ') : String(respErr.phone))
        if (respErr.address) srvErrors.push(Array.isArray(respErr.address) ? respErr.address.join(' ') : String(respErr.address))
        toast.error(srvErrors.join(' | ') || 'Validation error')
      } else {
        toast.error('Failed to update customer')
      }
    }
  }

  const filteredAndSorted = useMemo(() => {
    let list = customers.slice()
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.phone.includes(q))
    }
    // filter by product type placeholder - original had categories; keep all for now
    if (currentFilter !== 'all') {
      // placeholder: no-op (we don't have categories)
    }
    switch (currentSort) {
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'balance-high':
        list.sort((a, b) => b.balance - a.balance)
        break
      case 'balance-low':
        list.sort((a, b) => a.balance - b.balance)
        break
      case 'products':
        list.sort((a, b) => b.products - a.products)
        break
      case 'random':
        list.sort(() => Math.random() - 0.5)
        break
      default:
        break
    }
    return list
  }, [customers, query, currentFilter, currentSort])

  function handleAddCustomer(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const name = (fd.get('customerName') || '').toString()
    const phone = (fd.get('customerPhone') || '').toString()
    const address = (fd.get('customerAddress') || '').toString()
    setFormErrors({})
    const errors = {}
    if (!name.trim()) errors.name = 'Name is required'
    if (!phone.trim()) errors.phone = 'Phone is required'
    if (!address.trim()) errors.address = 'Address is required'
    if (Object.keys(errors).length) return setFormErrors(errors)

    ;(async () => {
      toast.info('Creating customer...')
      try {
        const svc = await import('../services/crmService')
        const created = await svc.createCustomer({ name: name.trim(), phone: phone.trim(), address: address.trim(), notes: '' })
        const mapped = { id: created.id, name: created.name, phone: created.phone, city: created.address || '', products: created.products_count || 0, balance: created.balance || 0 }
        setCustomers(prev => [mapped, ...prev])
        toast.success('Customer created')
        setIsModalOpen(false)
        e.target.reset()
      } catch (err) {
        const respErr = err?.response?.data
        if (respErr && typeof respErr === 'object') {
          const srvErrors = {}
          if (respErr.name) srvErrors.name = Array.isArray(respErr.name) ? respErr.name.join(' ') : String(respErr.name)
          if (respErr.phone) srvErrors.phone = Array.isArray(respErr.phone) ? respErr.phone.join(' ') : String(respErr.phone)
          if (respErr.address) srvErrors.address = Array.isArray(respErr.address) ? respErr.address.join(' ') : String(respErr.address)
          setFormErrors(srvErrors)
          toast.error('Validation error')
        } else {
          toast.error('Failed to create customer')
        }
      }
    })()
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 md:ml-64">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Customer Relationship Management</h2>
            <p className="text-gray-600">Manage customer relationships, track interactions, and monitor sales pipeline
              across your organization.</p>
          </div>

          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div className="flex flex-row gap-2 sm:gap-3 items-center">
                <div className="relative flex-1">
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search customers..." className="pl-3 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full" />
                </div>

                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setFilterOpen(v => !v); setSortOpen(false) }} id="typeFilter" className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 !rounded-button">
                    <div className="flex items-center gap-2"><i className="ri-filter-3-line"></i><span className="hidden sm:inline">All Types</span></div>
                  </button>
                  {filterOpen && (
                    <div id="typeDropdown" className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="p-2">
                        {['all', 'electronics', 'fashion', 'home', 'industrial', 'sports', 'beauty'].map(t => (
                          <button key={t} onClick={(ev) => { ev.stopPropagation(); setCurrentFilter(t); setFilterOpen(false) }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">{t[0].toUpperCase() + t.slice(1)}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative sm:flex-initial">
                  <button onClick={(e) => { e.stopPropagation(); setSortOpen(v => !v); setFilterOpen(false) }} id="sortBy" className="w-full sm:w-auto flex items-center justify-center gap-2 px-2 md:px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap !rounded-button">
                    <div className="w-4 h-4 flex items-center justify-center"><i className="ri-sort-desc"></i></div>
                    <span className="hidden xs:inline sm:inline">Sort by</span>
                    <div className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-down-s-line"></i></div>
                  </button>
                  {sortOpen && (
                    <div id="sortDropdown" className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="p-2">
                        {[
                          { "k": "name", "l": "Name (A → Z)" },
                          { "k": "-name", "l": "Name (Z → A)" },
                          { "k": "created_at", "l": "Created (oldest first)" },
                          { "k": "-created_at", "l": "Created (newest first)" },
                          { "k": "products_count", "l": "Products Count (fewest → most)" },
                          { "k": "-products_count", "l": "Products Count (most → fewest)" },
                          { "k": "address", "l": "Address (A → Z)" },
                          { "k": "-address", "l": "Address (Z → A)" },
                          { "k": "latest_sale", "l": "Latest Sale (oldest first)" },
                          { "k": "-latest_sale", "l": "Latest Sale (newest first)" },
                          { "k": "balance", "l": "Balance (low → high)" },
                          { "k": "-balance", "l": "Balance (high → low)" }
                        ].map(s => (
                          <button key={s.k} onClick={(ev) => { ev.stopPropagation(); setCurrentSort(s.k); setSortOpen(false) }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded" data-sort={s.k}>{s.l}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Table View (styled like InventoryTable) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 md:p-6 mb-8 hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Phone</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Address</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Products</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Balance</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingCustomers ? (
                    <tr><td colSpan={6} className="p-6 text-center text-gray-500">Loading customers...</td></tr>
                  ) : filteredAndSorted.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">No customers found. Use the "Add" button to create a customer.</td></tr>
                  ) : (
                    filteredAndSorted.map((c, idx) => (
                      <tr key={c.id ?? idx} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div>
                              <a onClick={() => openProfile(c.id ?? idx)} className="font-medium text-gray-900 hover:text-primary cursor-pointer transition-colors">{c.name}</a>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4"><p className="text-sm text-gray-500">{c.phone}</p></td>
                        <td className="py-3 px-4"><p className="text-sm text-gray-900">{c.city}</p></td>
                        <td className="py-3 px-4"><p className="text-sm text-gray-900">{c.products}</p></td>
                        <td className="py-3 px-4">
                          <p className={"font-semibold " + (c.balance >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(c.balance)}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button onClick={(ev)=>{ ev.stopPropagation(); openEdit(c)}} className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors !rounded-button" title="Edit Customer">
                              <div className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line"></i></div>
                            </button>
                            <button onClick={(ev)=>{ ev.stopPropagation(); handleDelete(c)}} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors !rounded-button" title="Delete Customer">
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 mt-4">
            {loadingCustomers ? (
              <div className="p-6 text-center text-gray-500">Loading customers...</div>
            ) : filteredAndSorted.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No customers found.</div>
            ) : (
              filteredAndSorted.map((c, idx) => (
                <div key={c.id ?? idx} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-sm text-gray-900 mt-1">{c.phone}</div>
                      <div className="text-sm text-gray-900 mt-1">{c.city}</div>
                    </div>
                    <div className="text-right">
                      <p className={"font-semibold " + (c.balance >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(c.balance)}</p>
                      <p className="text-sm text-gray-900 mt-1">{c.products}</p>
                      <div className="mt-3 flex gap-2 justify-end">
                        <button onClick={() => openProfile(c.id ?? idx)} className="px-3 py-2 bg-white border border-gray-200 text-sm rounded-lg text-gray-700 hover:bg-gray-50">View</button>
                        <button onClick={(ev)=>{ ev.stopPropagation(); openEdit(c)}} className="px-3 py-2 bg-white border border-gray-200 text-sm rounded-lg text-gray-700 hover:bg-gray-50">Edit</button>
                        <button onClick={(ev)=>{ ev.stopPropagation(); handleDelete(c)}} className="px-3 py-2 bg-white border border-red-200 text-sm rounded-lg text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

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

          {/* Pagination controls (InventoryTable style) */}
          <div className="flex items-center justify-center mt-8">
            <div className="flex items-center gap-2">
              <button onClick={() => { if (!customersMeta || !customersMeta.previous) return; setCurrentPageCustomers(p => Math.max(1, p - 1)) }} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap !rounded-button" disabled={!(customersMeta && customersMeta.previous)}>
                <i className="ri-arrow-left-s-line"></i>
                <span className="ml-1">Previous</span>
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">Page {currentPageCustomers}{customersMeta && customersMeta.count ? ' of ' + Math.max(1, Math.ceil(customersMeta.count / (customersMeta.pageSize || 1))) : ''}</span>
              <button onClick={() => { if (!customersMeta || !customersMeta.next) return; setCurrentPageCustomers(p => p + 1) }} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap !rounded-button" disabled={!(customersMeta && customersMeta.next)}>
                <span className="mr-1">Next</span>
                <i className="ri-arrow-right-s-line"></i>
              </button>
            </div>
          </div>

          {/* Add Customer Modal */}
          {isModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900">Add New Customer</h3>
                      <button onClick={() => setIsModalOpen(false)}
                              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <i className="ri-close-line"></i></button>
                    </div>
                    <form onSubmit={handleAddCustomer} id="addCustomerForm">
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">Customer
                            Name</label>
                          <input name="customerName" id="customerName" required defaultValue=""
                                 className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                 placeholder="Enter customer name"/>
                          {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
                        </div>
                        <div>
                          <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-2">Phone
                            Number</label>
                          <input name="customerPhone" id="customerPhone" required defaultValue=""
                                 className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                 placeholder="Enter phone number"/>
                          {formErrors.phone && <p className="mt-1 text-xs text-red-600">{formErrors.phone}</p>}
                        </div>
                        <div>
                          <label htmlFor="customerAddress"
                                 className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                          <input name="customerAddress" id="customerAddress" required defaultValue=""
                                 className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                 placeholder="Enter address"/>
                          {formErrors.address && <p className="mt-1 text-xs text-red-600">{formErrors.address}</p>}
                        </div>
                      </div>
                      <div className="flex gap-3 mt-6">
                        <button type="button" onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel
                        </button>
                        <button type="submit"
                                className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors">Add
                          Customer
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
          )}

          {/* Edit Customer Modal */}
          {editModalOpen && editingCustomer && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900">Edit Customer</h3>
                      <button onClick={() => { setEditModalOpen(false); setEditingCustomer(null) }}
                              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <i className="ri-close-line"></i></button>
                    </div>
                    <form onSubmit={handleEditSubmit} id="editCustomerForm">
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="editName" className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                          <input name="editName" id="editName" defaultValue={editingCustomer.name || ''}
                                 className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                 placeholder="Enter customer name"/>
                        </div>
                        <div>
                          <label htmlFor="editPhone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                          <input name="editPhone" id="editPhone" defaultValue={editingCustomer.phone || ''}
                                 className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                 placeholder="Enter phone number"/>
                        </div>
                        <div>
                          <label htmlFor="editAddress" className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                          <input name="editAddress" id="editAddress" defaultValue={editingCustomer.city || ''}
                                 className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                 placeholder="Enter address"/>
                        </div>
                        <div>
                          <label htmlFor="editNotes" className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                          <textarea name="editNotes" id="editNotes" defaultValue={editingCustomer.notes || ''}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder="Notes (optional)" />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-6">
                        <button type="button" onClick={() => { setEditModalOpen(false); setEditingCustomer(null) }}
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel
                        </button>
                        <button type="submit"
                                className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors">Save Changes
                        </button>
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
