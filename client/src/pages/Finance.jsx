import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import toast from '../services/toastService'

function formatMoney(value) {
  if (value == null || value === '') return '$0'
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Finance() {
  const [stats, setStats] = useState(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [accounts, setAccounts] = useState([])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  async function loadStats(currentSearch) {
    try {
      const svc = await import('../services/financeService')
      const res = await svc.getFinanceStats({ search: currentSearch })
      setStats(res?.data ?? res)
    } catch (err) {
      toast.error('Failed to load finance stats')
    }
  }

  async function loadAccounts() {
    try {
      const svc = await import('../services/financeService')
      const res = await svc.getAccounts()
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.results || res)
      setAccounts(Array.isArray(list) ? list : [])
    } catch (err) {
      // Keep UI stable even if accounts fail to load
      setAccounts([])
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!mounted) return
      await loadStats(debouncedSearch)
      await loadAccounts()
    })()
    return () => { mounted = false }
  }, [debouncedSearch])

  const expenses = stats?.total_expenses
  const cash = stats?.cash_on_hand
  const banks = Array.isArray(stats?.banks) ? stats.banks : []
  const cashAccount = accounts.find((acct) => (
    acct.account_type === 'cash' ||
    acct.name?.toLowerCase() === 'cash on hand' ||
    acct.full_name?.toLowerCase() === 'cash on hand'
  ))
  const cashWithId = { ...cash, id: cashAccount?.id, name: cashAccount?.name, full_name: cashAccount?.full_name, account_number: cashAccount?.account_number }
  const banksWithIds = banks.map((bank) => {
    const match = accounts.find((acct) => (
      (bank?.account_number && acct.account_number === bank.account_number) ||
      (bank?.full_name && acct.full_name === bank.full_name) ||
      (bank?.name && acct.name === bank.name)
    ))
    return { ...bank, id: bank?.id ?? match?.id }
  })

  function openAddAccount() {
    setAccountModalOpen(true)
  }

  function openEditAccount(account) {
    const match = accounts.find((acct) => (
      (account?.account_number && acct.account_number === account.account_number) ||
      (account?.full_name && acct.full_name === account.full_name) ||
      (account?.name && acct.name === account.name)
    ))
    const resolvedId = account?.id ?? account?.account_id ?? match?.id
    if (!resolvedId) {
      toast.error('Unable to resolve account id for editing')
    }
    setEditingAccount({ ...account, id: resolvedId, account_id: resolvedId })
    setEditModalOpen(true)
  }

  async function handleCreateAccount(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const name = (fd.get('accountName') || '').toString().trim()
    const fullName = (fd.get('accountFullName') || '').toString().trim()
    const accountType = (fd.get('accountType') || '').toString().trim()
    const accountNumber = (fd.get('accountNumber') || '').toString().trim()

    if (!name || !fullName || !accountType || !accountNumber) {
      toast.error('All fields are required')
      return
    }

    try {
      toast.info('Creating account...')
      const svc = await import('../services/financeService')
      await svc.createAccount({
        name,
        full_name: fullName,
        account_type: accountType,
        account_number: accountNumber
      })
      setAccountModalOpen(false)
      e.target.reset()
      await loadStats(debouncedSearch)
      toast.success('Account created')
    } catch (err) {
      toast.error('Failed to create account')
    }
  }

  async function handleEditAccount(e) {
    e.preventDefault()
    if (!editingAccount?.id && !editingAccount?.account_id) {
      toast.error('Missing account id')
      return
    }
    const fd = new FormData(e.target)
    const name = (fd.get('editAccountName') || '').toString().trim()
    const fullName = (fd.get('editAccountFullName') || '').toString().trim()
    const accountType = (fd.get('editAccountType') || '').toString().trim()
    const accountNumber = (fd.get('editAccountNumber') || '').toString().trim()

    if (!name || !fullName || !accountType || !accountNumber) {
      toast.error('All fields are required')
      return
    }

    try {
      toast.info('Updating account...')
      const svc = await import('../services/financeService')
      console.log('Updating account...', { id: editingAccount.id , name, full_name: fullName, account_type: accountType, account_number: accountNumber })
      await svc.updateAccount(editingAccount.id || editingAccount.account_id, {
        name,
        full_name: fullName,
        account_type: accountType,
        account_number: accountNumber
      })
      setEditModalOpen(false)
      setEditingAccount(null)
      await loadStats(debouncedSearch)
      await loadAccounts()
      toast.success('Account updated')
    } catch (err) {
      toast.error('Failed to update account')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 md:ml-64">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Finance Management</h2>
            <p className="text-gray-600">Monitor financial performance, manage cash flow, and track revenue and expenses across your business operations.</p>
          </div>

          <div className="mb-8 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="relative w-full md:w-72">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accounts..." className="w-full pl-3 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <button onClick={openAddAccount} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm">Add Account</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                  <i className="ri-money-dollar-box-line text-white text-xl"></i>
                </div>
                <span className="text-sm text-red-100">Expense</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Total Expenses</h3>
              <p className="text-sm text-red-100 mb-2">{expenses?.label || 'Operating Costs'}</p>
              <p className="text-2xl font-bold text-white">{formatMoney(expenses?.amount)}</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1 text-red-100 text-xs">
                  <i className="ri-arrow-up-line text-sm"></i>
                  <span>{expenses?.change_vs_last_month || '0%'}</span>
                </div>
                <span className="text-xs text-red-100">vs last month</span>
              </div>
            </div>

            <Link to="/finance/cash" className="block bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-purple-200 hover:scale-105 transition-all duration-300 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="ri-cash-line text-purple-600 text-xl"></i>
                </div>
                <span className="text-sm text-gray-500">{cashWithId?.name || 'Cash'}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{cashWithId?.full_name || 'Cash on Hand'}</h3>
              <p className="text-sm text-gray-600 mb-2">Account: {cashWithId?.account_number || '—'}</p>
              <p className="text-2xl font-bold text-purple-600">{formatMoney(cash?.amount)}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">{cash?.label || 'Available Cash'}</span>
                {cashWithId?.id && (
                  <button
                    onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); openEditAccount(cashWithId) }}
                    className="text-xs text-gray-500 hover:text-primary"
                  >
                    Edit
                  </button>
                )}
              </div>
            </Link>

            {banksWithIds.map((acct, index) => (
              <div key={acct.id || acct.name || index} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="ri-bank-line text-blue-600 text-xl"></i>
                  </div>
                  <span className="text-xs font-medium text-gray-500">{acct.name}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{acct.full_name}</h3>
                <p className="text-sm text-gray-600 mb-2">Account: {acct.account_number}</p>
                <p className="text-2xl font-bold text-green-600">{formatMoney(acct.balance)}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">{acct.label || 'Available Balance'}</span>
                  <button onClick={(ev) => { ev.stopPropagation(); openEditAccount(acct) }} className="text-xs text-gray-500 hover:text-primary">Edit</button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {accountModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Add Account</h3>
              <button onClick={() => setAccountModalOpen(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input name="accountName" required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Short name (e.g. CBE)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input name="accountFullName" required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Full account name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                  <select name="accountType" required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm">
                    <option value="">Select type</option>
                    <option value="bank">Bank Account</option>
                    <option value="cash">Cash on Hand</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                  <input name="accountNumber" required className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Account number" />
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setAccountModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap !rounded-button">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap !rounded-button">Save Account</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && editingAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Edit Account</h3>
              <button onClick={() => { setEditModalOpen(false); setEditingAccount(null) }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleEditAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input name="editAccountName" required defaultValue={editingAccount.name || ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Short name (e.g. CBE)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input name="editAccountFullName" required defaultValue={editingAccount.full_name || ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Full account name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                  <select name="editAccountType" required defaultValue={editingAccount.account_type || ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm">
                    <option value="">Select type</option>
                    <option value="bank">Bank Account</option>
                    <option value="cash">Cash on Hand</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                  <input name="editAccountNumber" required defaultValue={editingAccount.account_number || ''} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" placeholder="Account number" />
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => { setEditModalOpen(false); setEditingAccount(null) }} className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap !rounded-button">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap !rounded-button">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
