import React, { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import InventoryTabs from '../components/InventoryTabs'
import toast from '../services/toastService'

export default function InventoryCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [ordering, setOrdering] = useState('name')
  const [sortOpen, setSortOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

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
        const res = await svc.getCategories({ page, search: debouncedSearch, ordering })
        const data = res?.data ?? res
        const list = Array.isArray(data) ? data : (data?.results ?? [])
        if (!mounted) return
        setCategories(list)
        if (data && !Array.isArray(data)) {
          setMeta({ count: data.count, next: data.next, previous: data.previous, pageSize: (data.results || []).length })
        } else {
          setMeta({ count: list.length, next: null, previous: null, pageSize: list.length })
        }
      } catch (err) {
        toast.error('Failed to load categories')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [debouncedSearch, ordering, page])

  const filtered = useMemo(() => categories.slice(), [categories])

  function openEdit(category) {
    setEditingCategory(category)
    setEditModalOpen(true)
  }

  async function handleDelete(category) {
    const confirmed = window.confirm('If you delete this category you will lose all related records')
    if (!confirmed) return
    try {
      toast.info('Deleting category...')
      const svc = await import('../services/inventoryService')
      await svc.deleteCategory(category.id)
      setCategories(prev => prev.filter(c => c.id !== category.id))
      toast.success('Category deleted')
    } catch (err) {
      toast.error('Failed to delete category')
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const name = (fd.get('categoryName') || '').toString().trim()
    const description = (fd.get('categoryDescription') || '').toString().trim()

    if (!name) {
      toast.error('Name is required')
      return
    }

    const payload = { name, description }
    const tempId = `temp-${Date.now()}`
    const optimistic = { id: tempId, ...payload, item_count: 0, optimistic: true }
    setCategories(prev => [optimistic, ...prev])
    setIsModalOpen(false)
    e.target.reset()

    try {
      toast.info('Creating category...')
      const svc = await import('../services/inventoryService')
      const res = await svc.createCategory(payload)
      const created = res?.data ?? res
      const merged = { ...optimistic, ...created }
      setCategories(prev => prev.map(c => (c.id === tempId ? merged : c)))
      toast.success('Category created')
    } catch (err) {
      setCategories(prev => prev.filter(c => c.id !== tempId))
      toast.error('Failed to create category')
      setIsModalOpen(true)
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editingCategory) return
    const fd = new FormData(e.target)
    const name = (fd.get('editCategoryName') || '').toString().trim()
    const description = (fd.get('editCategoryDescription') || '').toString().trim()

    if (!name) {
      toast.error('Name is required')
      return
    }

    const payload = { name, description }
    const prev = categories.find(c => c.id === editingCategory.id)
    if (!prev) return
    const optimistic = { ...prev, ...payload }
    setCategories(prevList => prevList.map(c => (c.id === optimistic.id ? optimistic : c)))
    setEditModalOpen(false)
    setEditingCategory(null)

    try {
      toast.info('Updating category...')
      const svc = await import('../services/inventoryService')
      const res = await svc.updateCategory(optimistic.id, payload)
      const updated = res?.data ?? res
      setCategories(prevList => prevList.map(c => (c.id === updated.id ? { ...c, ...updated } : c)))
      toast.success('Category updated')
    } catch (err) {
      setCategories(prevList => prevList.map(c => (c.id === prev.id ? prev : c)))
      toast.error('Failed to update category')
      setEditingCategory(prev)
      setEditModalOpen(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-20 md:pb-0">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 md:ml-64">
          <div className="mb-8">
            <h2 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Categories</h2>
            <p className="text-sm md:text-base text-gray-600">Organize inventory items by category.</p>
          </div>

          <div className="mb-6">
            <InventoryTabs />
          </div>

          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div className="flex flex-row gap-2 sm:gap-3 items-center">
                <div className="relative flex-1">
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories..." className="pl-3 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full" />
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
                          { "k": "name", "l": "Name (A → Z)" },
                          { "k": "-name", "l": "Name (Z → A)" },
                          { "k": "created_at", "l": "Created (oldest first)" },
                          { "k": "-created_at", "l": "Created (newest first)" },
                          { "k": "item_count", "l": "Item Count (fewest → most)" },
                          { "k": "-item_count", "l": "Item Count (most → fewest)" }
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
                <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm">Add Category</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 md:p-6 mb-8 hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Items</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={4} className="p-6 text-center text-gray-500">Loading categories...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-gray-500">No categories found.</td></tr>
                  ) : (
                    filtered.map((cat) => (
                      <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4"><p className="text-sm font-medium text-gray-900">{cat.name}</p></td>
                        <td className="py-3 px-4"><p className="text-sm text-gray-700">{cat.description || ''}</p></td>
                        <td className="py-3 px-4"><p className="text-sm text-gray-700">{cat.item_count ?? ''}</p></td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button onClick={(ev)=>{ ev.stopPropagation(); openEdit(cat) }} className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors !rounded-button" title="Edit Category">
                              <div className="w-4 h-4 flex items-center justify-center"><i className="ri-edit-line"></i></div>
                            </button>
                            <button onClick={(ev)=>{ ev.stopPropagation(); handleDelete(cat) }} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors !rounded-button" title="Delete Category">
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
              <div className="p-4 text-center text-gray-500">Loading categories...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No categories found.</div>
            ) : (
              filtered.map((cat) => (
                <div key={cat.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-sm text-gray-900">{cat.name}</h3>
                      <p className="text-xs text-gray-500">{cat.description || ''}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{cat.item_count ?? ''}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={(ev)=>{ ev.stopPropagation(); openEdit(cat) }} className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
                      <i className="ri-edit-line mr-1"></i>Edit
                    </button>
                    <button onClick={(ev)=>{ ev.stopPropagation(); handleDelete(cat) }} className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
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

          {editModalOpen && editingCategory && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Edit Category</h3>
                    <button onClick={() => { setEditModalOpen(false); setEditingCategory(null) }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <i className="ri-close-line"></i>
                    </button>
                  </div>
                  <form onSubmit={handleEditSubmit} id="editCategoryForm">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                        <input name="editCategoryName" required defaultValue={editingCategory.name || ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter category name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea name="editCategoryDescription" defaultValue={editingCategory.description || ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter description" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button type="button" onClick={() => { setEditModalOpen(false); setEditingCategory(null) }} className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">Cancel</button>
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
                    <h3 className="text-xl font-bold text-gray-900">Add New Category</h3>
                    <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <i className="ri-close-line"></i>
                    </button>
                  </div>
                  <form onSubmit={handleCreate} id="addCategoryForm">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                        <input name="categoryName" required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter category name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea name="categoryDescription" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Enter description" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">Cancel</button>
                      <button type="submit" className="flex-1 px-4 py-3 bg-primary text-white rounded-lg text-sm font-medium">Add Category</button>
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
