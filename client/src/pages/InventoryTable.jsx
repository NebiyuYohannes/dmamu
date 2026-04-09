import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import toast from '../services/toastService'
import { cn } from '../utils/cn'
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, Filter, ArrowLeft, Package, Boxes, DollarSign, Tag } from 'lucide-react'

function formatCurrency(value) {
  if (value == null) return ''
  // If the backend already returned a formatted currency string, return as-is
  if (typeof value === 'string' && value.trim().startsWith('$')) return value
  const num = Number(typeof value === 'string' ? value.replace(/[^0-9.-]+/g, '') : value)
  if (Number.isNaN(num)) return ''
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function InventoryTable() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [nextPageUrl, setNextPageUrl] = useState(null)
  const [prevPageUrl, setPrevPageUrl] = useState(null)
  const [pageSize, setPageSize] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentFilter, setCurrentFilter] = useState('all')
  const [currentSort, setCurrentSort] = useState('item__name')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  const location = useLocation()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const svc = await import('../services/inventoryService')
        const res = await svc.getInventoryDetail(id, { page, inventory_search: debouncedSearch, inventory_ordering: currentSort })
        const data = res?.data ?? res
        if (!mounted) return
        // If navigation provided warehouse metadata use it (Inventory page passes state when navigating)
        const navWarehouse = location?.state?.warehouse
        setItem(navWarehouse ?? (data?.item ?? null))
        // paginated response: { count, next, previous, results }
        setCount(data?.count ?? 0)
        setNextPageUrl(data?.next ?? null)
        setPrevPageUrl(data?.previous ?? null)
        const ps = data?.page_size ?? data?.pageSize ?? (Array.isArray(data?.results) ? data.results.length : (Array.isArray(data) ? data.length : 0))
        setPageSize(ps || 0)
        if (Array.isArray(data)) {
          setProducts(data)
        } else if (Array.isArray(data?.results)) {
          setProducts(data.results)
        } else if (Array.isArray(data?.products)) {
          setProducts(data.products)
        } else {
          setProducts([])
        }
      } catch (err) {
        toast.error('Failed to load inventory detail')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id, location, page, debouncedSearch, currentSort])

  // Reset page when filter, sort or search changes
  useEffect(() => {
    setPage(1)
  }, [currentFilter, currentSort, debouncedSearch])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const filtered = useMemo(() => {
    let list = products.slice()
    if (currentFilter !== 'all') {
      list = list.filter((product) => String(product.category || '').toLowerCase() === currentFilter)
    }
    // helpers to extract numeric values safely from backend-provided strings
    const numericStock = (p) => {
      if (p == null) return 0
      const s = p.stock
      if (typeof s === 'number') return s
      if (typeof s === 'string') {
        const n = parseFloat(s.replace(/[^0-9.-]+/g, ''))
        return Number.isFinite(n) ? n : 0
      }
      return 0
    }
    const numericWorth = (p) => {
      if (p == null) return 0
      const w = p.worth
      if (typeof w === 'number') return w
      if (typeof w === 'string') {
        const n = parseFloat(w.replace(/[^0-9.-]+/g, ''))
        return Number.isFinite(n) ? n : 0
      }
      return 0
    }
    switch (currentSort) {
      case 'item__name':
        list.sort((a, b) => (a.product || '').localeCompare(b.product || ''))
        break
      case '-item__name':
        list.sort((a, b) => (b.product || '').localeCompare(a.product || ''))
        break
      case 'current_stock':
        list.sort((a, b) => numericStock(a) - numericStock(b))
        break
      case '-current_stock':
        list.sort((a, b) => numericStock(b) - numericStock(a))
        break
      case 'item__category__name':
        list.sort((a, b) => (String(a.category || '')).localeCompare(String(b.category || '')))
        break
      case '-item__category__name':
        list.sort((a, b) => (String(b.category || '')).localeCompare(String(a.category || '')))
        break
      case 'item__unit_price':
        list.sort((a, b) => {
          const ap = Number(String(a.unit_price || a.item_unit_price || 0).replace(/[^0-9.-]+/g, ''))
          const bp = Number(String(b.unit_price || b.item_unit_price || 0).replace(/[^0-9.-]+/g, ''))
          return ap - bp
        })
        break
      case '-item__unit_price':
        list.sort((a, b) => {
          const ap = Number(String(a.unit_price || a.item_unit_price || 0).replace(/[^0-9.-]+/g, ''))
          const bp = Number(String(b.unit_price || b.item_unit_price || 0).replace(/[^0-9.-]+/g, ''))
          return bp - ap
        })
        break
      case 'worth':
        list.sort((a, b) => numericWorth(a) - numericWorth(b))
        break
      case '-worth':
        list.sort((a, b) => numericWorth(b) - numericWorth(a))
        break
      default:
        break
    }
    return list
  }, [products, currentFilter, currentSort])

  function openEdit(product) {
    setEditingProduct(product)
    setEditModalOpen(true)
  }

  function handleDelete(productId) {
    const target = products.find((p) => p.id === productId)
    if (!target) return
    if (!window.confirm(`Are you sure you want to delete ${target.product}?`)) return
    setProducts((prev) => prev.filter((p) => p.id !== productId))
    toast.error(`${target.product} has been deleted`)
  }

  function handleEditSubmit(e) {
    e.preventDefault()
    if (!editingProduct) return
    const fd = new FormData(e.target)
    const product = (fd.get('editProduct') || '').toString().trim()
    const category = (fd.get('editCategory') || '').toString().trim()
    const stock = Number(fd.get('editStock') || 0)
    const worth = Number(fd.get('editWorth') || 0)
    if (!product || !category) {
      toast.error('Product and category are required')
      return
    }
    setProducts((prev) => prev.map((p) => p.id === editingProduct.id ? { ...p, product, category, stock, worth } : p))
    toast.success('Product updated')
    setEditModalOpen(false)
    setEditingProduct(null)
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pt-20 pb-20 md:pb-0">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 md:ml-64 w-full transition-all duration-300">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3 md:mb-4">
              <Link to="/inventory" className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors font-medium">
                <ArrowLeft size={16} />
                <span className="text-sm">Back to Inventory</span>
              </Link>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 border-b-2 border-primary inline-block pb-1">{item?.name || 'Inventory Detail'}</h2>
            <p className="text-gray-500 text-sm mt-2">Comprehensive product information and inventory management</p>
          </div>

          <div className="bg-white border text-sm md:text-base border-gray-200 rounded-2xl shadow-sm mb-8 overflow-hidden">
            <div className="p-4 md:p-5 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/30">
              <div className="relative w-full md:w-96 group flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                />
              </div>

              <div className="relative flex items-center gap-3 w-full md:w-auto">
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setFilterOpen(v => !v); setSortOpen(false) }}
                    className="w-full md:w-auto px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-700 hover:bg-gray-50 !rounded-button flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Filter size={16} />
                    <span className="hidden sm:inline">All Categories</span>
                  </button>
                  {filterOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                      <div className="py-2">
                        {[
                          { k: 'all', l: 'All Categories' },
                          { k: 'safety equipment', l: 'Safety Equipment' },
                          { k: 'tools', l: 'Tools' },
                          { k: 'machinery', l: 'Machinery' },
                          { k: 'materials', l: 'Materials' }
                        ].map((opt) => (
                          <button
                            key={opt.k}
                            onClick={(ev) => { ev.stopPropagation(); setCurrentFilter(opt.k); setFilterOpen(false) }}
                            className={cn("w-full text-left px-4 py-2 text-sm transition-colors", currentFilter === opt.k ? "bg-primary/5 text-primary font-medium" : "text-gray-700 hover:bg-gray-50")}
                          >
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSortOpen(v => !v); setFilterOpen(false) }}
                    className="w-full md:w-auto px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-700 hover:bg-gray-50 !rounded-button flex items-center justify-center gap-2 shadow-sm"
                  >
                    <ArrowUpDown size={16} />
                    <span className="hidden sm:inline">Sort</span>
                  </button>
                  {sortOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                      <div className="py-2 max-h-64 overflow-y-auto">
                        {[
                          { k: 'current_stock', l: 'Stock (low → high)' },
                          { k: '-current_stock', l: 'Stock (high → low)' },
                          { k: 'item__name', l: 'Product Name (A → Z)' },
                          { k: '-item__name', l: 'Product Name (Z → A)' },
                          { k: 'item__category__name', l: 'Category (A → Z)' },
                          { k: '-item__category__name', l: 'Category (Z → A)' },
                          { k: 'item__unit_price', l: 'Unit Price (low → high)' },
                          { k: '-item__unit_price', l: 'Unit Price (high → low)' },
                          { k: 'worth', l: 'Worth (low → high)' },
                          { k: '-worth', l: 'Worth (high → low)' }
                        ].map((opt) => (
                          <button
                            key={opt.k}
                            onClick={(ev) => { ev.stopPropagation(); setCurrentSort(opt.k); setSortOpen(false) }}
                            className={cn("w-full text-left px-4 py-2 text-sm transition-colors", currentSort === opt.k ? "bg-primary/5 text-primary font-medium" : "text-gray-700 hover:bg-gray-50")}
                          >
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 md:p-5">
              <h3 className="text-lg md:text-xl font-bold tracking-tight text-gray-900 mb-4 border-b pb-2 inline-block border-gray-200">Products Overview</h3>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                      <tr className="text-xs font-semibold text-gray-500 uppercase">
                      <th className="py-3 px-4 border-b border-gray-200">Product</th>
                      <th className="py-3 px-4 border-b border-gray-200">Category</th>
                      <th className="py-3 px-4 border-b border-gray-200">Stock Node</th>
                      <th className="py-3 px-4 border-b border-gray-200">Worth Metric</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr><td colSpan={4} className="p-8 text-center text-gray-500">Loading inventory...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-gray-500">No products found.</td></tr>
                    ) : (
                      filtered.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <Package className="text-primary/70 shrink-0" size={16} />
                              <p className="font-semibold text-gray-900">{product.product}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 flex gap-1">
                              <Tag size={12}/>{product.category || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-semibold text-gray-900 bg-gray-50 px-2 py-1 rounded-md">{product.stock} count</span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-900 flex items-center gap-1">
                            <DollarSign className="text-gray-400" size={14}/> {formatCurrency(product.worth).replace('$', '')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-4">
                {loading ? (
                  <div className="p-6 text-center text-gray-500">Loading inventory...</div>
                ) : filtered.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No products found.</div>
                ) : (
                  filtered.map((product) => (
                    <div key={product.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3 border-b border-gray-50 pb-2">
                        <div className="flex items-center gap-2">
                          <Package className="text-primary/50" size={16} />
                          <h3 className="font-semibold text-gray-900 text-sm">{product.product}</h3>
                        </div>
                        <span className="font-bold text-gray-900 text-sm">{formatCurrency(product.worth)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">{product.category || 'Uncategorized'}</span>
                        <span className="font-medium bg-gray-100 px-2 py-0.5 rounded">{product.stock} units</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {(() => {
              const hasMeta = Boolean(count)
              const showPagination = Boolean(prevPageUrl) || Boolean(nextPageUrl) || (hasMeta && pageSize && count > pageSize)
              if (!showPagination) return null
              return (
                <div className="flex items-center justify-between p-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500 hidden sm:block">
                     Page {page}{count ? ' of ' + Math.max(1, Math.ceil(count / (pageSize || 1))) : ''}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <button
                      onClick={() => {
                        if (!prevPageUrl) return
                        try {
                          const u = new URL(prevPageUrl, window.location.origin)
                          const p = Number(u.searchParams.get('page') || 1)
                          setPage(Number.isFinite(p) ? Math.max(1, p) : (page > 1 ? page - 1 : 1))
                        } catch (e) {
                          setPage(p => Math.max(1, p - 1))
                        }
                      }}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap !rounded-button flex items-center"
                      disabled={!prevPageUrl}
                    >
                      <ChevronLeft className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:block">Previous</span>
                    </button>

                    <span className="text-sm text-gray-500 sm:hidden self-center">Page {page}</span>

                    <button
                      onClick={() => {
                        if (!nextPageUrl) return
                        try {
                          const u = new URL(nextPageUrl, window.location.origin)
                          const p = Number(u.searchParams.get('page') || 1)
                          setPage(Number.isFinite(p) ? p : page + 1)
                        } catch (e) {
                          setPage(p => p + 1)
                        }
                      }}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap !rounded-button flex items-center"
                      disabled={!nextPageUrl}
                    >
                      <span className="hidden sm:block">Next</span>
                      <ChevronRight className="w-4 h-4 sm:ml-1" />
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </main>
      </div>
    </div>
  )
}
