import api from './api'

// ─── Suppliers ───────────────────────────────────────────────
export const getSuppliers = () =>
    api.get('/suppliers/supplier/').then(r => r.data)

// ─── Items ───────────────────────────────────────────────────
export const getItems = (options = {}) => {
  const { page = 1, search = '', ordering = '', categoryName = '', category__name = '' } = options || {}
  const params = { page }
  if (search) params.search = search
  if (ordering) params.ordering = ordering
  if (categoryName) params['category__name'] = categoryName
  if (category__name) params['category__name'] = category__name
  return api.get('/inventory/items/', { params }).then(r => r.data)
}

// ─── Categories ──────────────────────────────────────────────
export const getCategories = (options = {}) => {
  const { page = 1, search = '', ordering = '' } = options || {}
  const params = { page }
  if (search) params.search = search
  if (ordering) params.ordering = ordering
  return api.get('/inventory/categories/', { params }).then(r => r.data)
}

export const createCategory = (payload) =>
    api.post('/inventory/categories/', payload).then(r => r.data)

export const updateCategory = (id, payload) =>
    api.patch(`/inventory/categories/${id}/`, payload).then(r => r.data)

export const deleteCategory = (id) =>
    api.delete(`/inventory/categories/${id}/`).then(r => r.data)

// ─── Warehouses ──────────────────────────────────────────────
export const getWarehouses = (options = {}) => {
  const { search = '', ordering = '', name = '' } = options || {}
  const params = {}
  if (search) params.search = search
  if (options.page) params.page = options.page
  if (ordering) params.ordering = ordering
  if (name) params.name = name
  return api.get('/inventory/warehouses/', { params }).then(r => r.data)
}

export const createWarehouse = (payload) =>
    api.post('/inventory/warehouses/', payload).then(r => r.data)

export const updateWarehouse = (id, payload) =>
    api.patch(`/inventory/warehouses/${id}/`, payload).then(r => r.data)

export const deleteWarehouse = (id) =>
    api.delete(`/inventory/warehouses/${id}/`).then(r => r.data)

// ─── Warehouse Products / Detail ─────────────────────────────
export const getWarehouseProducts = (id, options = {}) => {
  const {
    inventory_search = '',
    category = '',
    inventory_ordering = ''
  } = options || {}
  const params = {}
  if (inventory_search) params.inventory_search = inventory_search
  if (category) params.category = category
  if (options.page) params.page = options.page
  if (inventory_ordering) params.inventory_ordering = inventory_ordering
  return api.get(`/inventory/warehouses/${id}/`, { params }).then(r => r.data)
}

// Alias for backward compatibility
export const getInventoryDetail = getWarehouseProducts

// ─── Items CRUD ───────────────────────────────────────────────
export const createItem = (payload) =>
    api.post('/inventory/items/', payload).then(r => r.data)

export const updateItem = (id, payload) =>
    api.patch(`/inventory/items/${id}/`, payload).then(r => r.data)

export const deleteItem = (id) =>
    api.delete(`/inventory/items/${id}/`).then(r => r.data)

// ─── Stock Movements ─────────────────────────────────────────
export const getStockMovements = (options = {}) => {
  const { page = 1, search = '', ordering = '' } = options || {}
  const params = { page }
  if (search) params.search = search
  if (ordering) params.ordering = ordering
  return api.get('/inventory/stock-movements/', { params }).then(r => r.data)
}

export const getStockMovementDetail = (id) =>
    api.get(`/inventory/stock-movements/${id}/`).then(r => r.data)

export const createStockMovement = (payload) =>
    api.post('/inventory/stock-movements/', payload).then(r => r.data)

export const updateStockMovement = (id, payload) =>
    api.patch(`/inventory/stock-movements/${id}/`, payload).then(r => r.data)

export const deleteStockMovement = (id) =>
    api.delete(`/inventory/stock-movements/${id}/`).then(r => r.data)

// ─── Dropdowns ───────────────────────────────────────────────
export const getInventoryDropdown = (options = {}) => {
  const { search = '' } = options || {}
  const params = {}
  if (search) params.search = search
  return api.get('/inventory/inventory-dropdown/', { params }).then(r => r.data)
}

export const getPurchaseDropdown = () =>
    api.get('/sales-purchases/purchase-dropdown/').then(r => r.data)

export const getSaleDropdown = () =>
    api.get('/sales-purchases/sale-dropdown/').then(r => r.data)

// ─── Purchases ───────────────────────────────────────────────
export const createPurchase = (payload) =>
    api.post('/sales-purchases/purchases/', payload).then(r => r.data)