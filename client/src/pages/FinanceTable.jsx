import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import toast from '../services/toastService'

function formatMoney(value, sign = '') {
  if (value == null || value === '') return `${sign}$0.00`
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return `${sign}$${Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function FinanceTable() {
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [saleOptions, setSaleOptions] = useState([])
  const [purchaseOptions, setPurchaseOptions] = useState([])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  async function loadCash(searchText, typeValue) {
    try {
      const svc = await import('../services/financeService')
      const res = await svc.getCashSummary({
        search: searchText,
        type: typeValue === 'all' ? '' : typeValue
      })
      const data = res?.data ?? res
      setSummary(data)
      setTransactions(Array.isArray(data?.transaction_history) ? data.transaction_history : [])
    } catch (err) {
      toast.error('Failed to load cash management data')
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const svc = await import('../services/financeService')
        const [accountsRes, salesRes, purchasesRes] = await Promise.all([
          svc.getAccounts(),
          svc.getSaleDropdown(),
          svc.getPurchaseDropdown()
        ])
        if (!mounted) return
        setAccounts(accountsRes?.data ?? accountsRes ?? [])
        setSaleOptions(salesRes?.data ?? salesRes ?? [])
        setPurchaseOptions(purchasesRes?.data ?? purchasesRes ?? [])
      } catch (err) {
        if (mounted) {
          setAccounts([])
          setSaleOptions([])
          setPurchaseOptions([])
        }
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    loadCash(debouncedQuery, typeFilter)
  }, [debouncedQuery, typeFilter])

  function openModal() {
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
  }

  async function handleCreateTransaction(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const account = (fd.get('transactionAccount') || '').toString().trim()
    const type = (fd.get('transactionType') || '').toString().trim()
    const amount = (fd.get('transactionAmount') || '').toString().trim()
    const description = (fd.get('transactionDescription') || '').toString().trim()
    const notes = (fd.get('transactionNotes') || '').toString().trim()
    const linkedSale = (fd.get('transactionSale') || '').toString().trim()
    const linkedPurchase = (fd.get('transactionPurchase') || '').toString().trim()

    if (!account || !type || !amount || !description) {
      toast.error('Account, type, amount, and description are required')
      return
    }

    const payload = {
      account,
      type,
      amount: Number(amount),
      description,
      notes: notes || '',
      linked_sale: linkedSale || null,
      linked_purchase: linkedPurchase || null
    }

    try {
      toast.info('Saving transaction...')
      const svc = await import('../services/financeService')
      await svc.createFinanceTransaction(payload)
      closeModal()
      e.target.reset()
      await loadCash(debouncedQuery, typeFilter)
      toast.success('Transaction saved')
    } catch (err) {
      toast.error('Failed to save transaction')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 md:ml-64">
          <div className="flex items-center gap-4 mb-6">
            <Link to="/finance" className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors">
              <i className="ri-arrow-left-line text-lg"></i>
            </Link>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Cash Management</h2>
              <p className="text-gray-600">Track and manage all cash transactions with detailed history and reporting</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="ri-cash-line text-purple-600 text-xl"></i>
                </div>
                <span className="text-sm text-gray-500">Current Balance</span>
              </div>
              <p className="text-3xl font-bold text-purple-600 mb-1">{formatMoney(summary?.current_balance)}</p>
              <p className="text-sm text-gray-600">Available Cash</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="ri-arrow-up-line text-green-600 text-xl"></i>
                </div>
                <span className="text-sm text-gray-500">Total Inflows</span>
              </div>
              <p className="text-3xl font-bold text-green-600 mb-1">{formatMoney(summary?.total_inflows, '+')}</p>
              <p className="text-sm text-gray-600">All Inflows</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <i className="ri-arrow-down-line text-red-600 text-xl"></i>
                </div>
                <span className="text-sm text-gray-500">Total Outflows</span>
              </div>
              <p className="text-3xl font-bold text-red-600 mb-1">{formatMoney(summary?.total_outflows, '-')}</p>
              <p className="text-sm text-gray-600">All Outflows</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
            <div className="p-6 border-b border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-2">
                    <div className="relative">
                      <button onClick={() => setFilterOpen(v => !v)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 whitespace-nowrap !rounded-button">
                        <span>{typeFilter === 'all' ? 'All Types' : typeFilter}</span>
                        <i className="ri-arrow-down-s-line"></i>
                      </button>
                      {filterOpen && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
                          <div className="p-2">
                            {[
                              { k: 'all', l: 'All Types' },
                              { k: 'inflow', l: 'Inflow' },
                              { k: 'outflow', l: 'Outflow' }
                            ].map(opt => (
                              <button key={opt.k} onClick={() => { setTypeFilter(opt.k); setFilterOpen(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded transition-colors">
                                {opt.l}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transactions..." className="px-3 py-2 text-sm border border-gray-200 rounded-lg w-full" />
                  </div>
                  <button onClick={openModal} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 whitespace-nowrap !rounded-button">
                    <i className="ri-add-line"></i>
                    Add Transaction
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No transactions found.</div>
                ) : (
                  transactions.map(tx => {
                    const isInflow = tx.type === 'inflow'
                    const amountDisplay = formatMoney(tx.amount, isInflow ? '+' : '-')
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 ${isInflow ? 'bg-green-100' : 'bg-red-100'} rounded-lg flex items-center justify-center`}>
                            <i className={`${isInflow ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} ${isInflow ? 'text-green-600' : 'text-red-600'}`}></i>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{tx.description}</p>
                            <p className="text-sm text-gray-600">{tx.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${isInflow ? 'text-green-600' : 'text-red-600'}`}>{amountDisplay}</p>
                          <p className="text-sm text-gray-500">Balance: {formatMoney(tx.balance)}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Add New Transaction</h3>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-88px)]">
              <form onSubmit={handleCreateTransaction} className="space-y-4" id="transactionForm">
                <div>
                  <label htmlFor="transactionAccount" className="block text-sm font-medium text-gray-700">Account</label>
                  <select name="transactionAccount" id="transactionAccount" required className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary">
                    <option value="">Select an account</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="transactionType" className="block text-sm font-medium text-gray-700">Type</label>
                  <select name="transactionType" id="transactionType" required className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary">
                    <option value="">Select a type</option>
                    <option value="inflow">Inflow</option>
                    <option value="outflow">Outflow</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="transactionAmount" className="block text-sm font-medium text-gray-700">Amount</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                      <i className="ri-money-dollar-circle-line"></i>
                    </span>
                    <input type="number" name="transactionAmount" id="transactionAmount" required className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" placeholder="0.00" step="0.01" min="0" />
                  </div>
                </div>

                <div>
                  <label htmlFor="transactionDescription" className="block text-sm font-medium text-gray-700">Description</label>
                  <input type="text" name="transactionDescription" id="transactionDescription" required className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" placeholder="Transaction description" />
                </div>

                <div>
                  <label htmlFor="transactionNotes" className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea name="transactionNotes" id="transactionNotes" rows="3" className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" placeholder="Additional notes (optional)"></textarea>
                </div>

                <div>
                  <label htmlFor="transactionSale" className="block text-sm font-medium text-gray-700">Linked Sale</label>
                  <select name="transactionSale" id="transactionSale" className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary">
                    <option value="">Select a sale (optional)</option>
                    {saleOptions.map(sale => (
                      <option key={sale.id || sale.label} value={sale.id}>{sale.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="transactionPurchase" className="block text-sm font-medium text-gray-700">Linked Purchase</label>
                  <select name="transactionPurchase" id="transactionPurchase" className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary">
                    <option value="">Select a purchase (optional)</option>
                    {purchaseOptions.map(purchase => (
                      <option key={purchase.id || purchase.label} value={purchase.id}>{purchase.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3">
                  <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 whitespace-nowrap">
                    <i className="ri-save-line"></i>
                    Save Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
