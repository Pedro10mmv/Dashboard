'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Category { id: string; name: string; type: 'income' | 'expense' | 'savings'; }
interface Transaction { id: string; categoryId: string; category?: Category; amount: number; description: string | null; txDate: string; }
interface BudgetItem { id: string; categoryId: string; category?: Category; planned: number; actual?: number; }
interface MonthlyBudget { id: string; month: string; incomeTarget: number; items: BudgetItem[]; }
interface AIBudget { income_target: number; budget_items: Array<{ category_name: string; planned_amount: number; rationale: string }>; insight: string; savings_rate_pct: number; }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function FinancePage() {
  const { profileId } = useParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [tab, setTab] = useState<'budget' | 'transactions' | 'categories'>('budget');
  const [aiBudget, setAiBudget] = useState<AIBudget | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Forms
  const [catForm, setCatForm] = useState({ name: '', type: 'expense' as string });
  const [txForm, setTxForm] = useState({ categoryId: '', amount: 0, description: '', txDate: new Date().toISOString().split('T')[0] });
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewTx, setShowNewTx] = useState(false);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const load = async () => {
    const [cats, txs] = await Promise.all([
      api.get<Category[]>(`/api/p/${profileId}/finance/categories`),
      api.get<Transaction[]>(`/api/p/${profileId}/finance/transactions?month=${currentMonth}`),
    ]);
    setCategories(cats);
    setTransactions(txs);
    try {
      const b = await api.get<MonthlyBudget>(`/api/p/${profileId}/finance/budgets/current`);
      setBudget(b);
    } catch { /* no budget */ }
  };

  useEffect(() => { load(); }, [profileId]);

  const createCategory = async () => {
    await api.post(`/api/p/${profileId}/finance/categories`, catForm);
    setCatForm({ name: '', type: 'expense' });
    setShowNewCat(false);
    load();
  };

  const deleteCategory = async (id: string) => {
    await api.delete(`/api/p/${profileId}/finance/categories/${id}`);
    load();
  };

  const createTransaction = async () => {
    await api.post(`/api/p/${profileId}/finance/transactions`, txForm);
    setTxForm({ categoryId: '', amount: 0, description: '', txDate: new Date().toISOString().split('T')[0] });
    setShowNewTx(false);
    load();
  };

  const deleteTransaction = async (id: string) => {
    await api.delete(`/api/p/${profileId}/finance/transactions/${id}`);
    load();
  };

  const generateBudget = async () => {
    setAiLoading(true);
    try {
      const res = await api.post<{ result: AIBudget }>(`/api/p/${profileId}/finance/ai/budget`);
      setAiBudget(res.result);
    } catch (err) { console.error(err); }
    setAiLoading(false);
  };

  // Computed
  const totalIncome = transactions.filter(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    return cat?.type === 'income';
  }).reduce((s, t) => s + t.amount, 0);

  const totalExpenses = transactions.filter(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    return cat?.type === 'expense';
  }).reduce((s, t) => s + t.amount, 0);

  const totalSavings = transactions.filter(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    return cat?.type === 'savings';
  }).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">💰 Finance</h1>
        <button className="btn-primary text-sm" onClick={generateBudget} disabled={aiLoading}>
          {aiLoading ? 'Generating...' : '🤖 AI Budget'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-emerald-400">${totalIncome.toFixed(0)}</p>
          <p className="text-xs text-[var(--text-muted)]">Income</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-400">${totalExpenses.toFixed(0)}</p>
          <p className="text-xs text-[var(--text-muted)]">Expenses</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-400">${totalSavings.toFixed(0)}</p>
          <p className="text-xs text-[var(--text-muted)]">Savings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-input)] p-1 rounded-lg">
        {(['budget', 'transactions', 'categories'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm rounded-md capitalize ${tab === t ? 'bg-brand-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Budget Tab */}
      {tab === 'budget' && (
        <div className="card">
          <h2 className="font-semibold mb-3">📊 {MONTHS[now.getMonth()]} {now.getFullYear()} Budget</h2>
          {budget ? (
            <>
              <p className="text-sm text-[var(--text-muted)] mb-3">Income target: <span className="text-brand-400">${budget.incomeTarget}</span></p>
              <div className="space-y-2">
                {budget.items.map(item => {
                  const cat = categories.find(c => c.id === item.categoryId);
                  const pct = item.planned > 0 ? Math.round(((item.actual || 0) / item.planned) * 100) : 0;
                  const overBudget = pct > 100;
                  return (
                    <div key={item.id} className="p-2 rounded bg-[var(--bg-input)]">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{cat?.name || 'Unknown'}</span>
                        <span className={overBudget ? 'text-red-400' : 'text-[var(--text-muted)]'}>
                          ${(item.actual || 0).toFixed(0)} / ${item.planned.toFixed(0)} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${overBudget ? 'bg-red-500' : 'bg-brand-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No budget set for this month. Use AI Budget or create categories first.</p>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">💳 Transactions ({MONTHS[now.getMonth()]})</h2>
            <button className="btn-secondary text-xs" onClick={() => setShowNewTx(!showNewTx)}>
              {showNewTx ? 'Cancel' : '+ Add'}
            </button>
          </div>
          {showNewTx && (
            <div className="p-3 mb-3 rounded-lg bg-[var(--bg-input)] space-y-2">
              <div className="flex gap-2">
                <select className="input flex-1" value={txForm.categoryId} onChange={e => setTxForm({ ...txForm, categoryId: e.target.value })}>
                  <option value="">Category...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                </select>
                <input type="number" placeholder="Amount" className="input w-28" value={txForm.amount || ''} onChange={e => setTxForm({ ...txForm, amount: Number(e.target.value) })} />
              </div>
              <div className="flex gap-2">
                <input placeholder="Description" className="input flex-1" value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} />
                <input type="date" className="input w-36" value={txForm.txDate} onChange={e => setTxForm({ ...txForm, txDate: e.target.value })} />
              </div>
              <button className="btn-primary text-sm" onClick={createTransaction} disabled={!txForm.categoryId || !txForm.amount}>Save</button>
            </div>
          )}
          <div className="space-y-1">
            {transactions.length === 0 && <p className="text-sm text-[var(--text-muted)]">No transactions this month.</p>}
            {transactions.map(tx => {
              const cat = categories.find(c => c.id === tx.categoryId);
              return (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded bg-[var(--bg-input)] text-sm group">
                  <div className="flex items-center gap-3">
                    <span className={`badge ${cat?.type === 'income' ? 'badge-green' : cat?.type === 'savings' ? 'badge-blue' : 'badge-default'}`}>
                      {cat?.name || '?'}
                    </span>
                    <span>${tx.amount.toFixed(2)}</span>
                    {tx.description && <span className="text-[var(--text-dim)]">{tx.description}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-muted)]">{formatDate(tx.txDate)}</span>
                    <button className="btn-ghost text-xs opacity-0 group-hover:opacity-100 text-red-400" onClick={() => deleteTransaction(tx.id)}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {tab === 'categories' && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">📁 Categories</h2>
            <button className="btn-secondary text-xs" onClick={() => setShowNewCat(!showNewCat)}>
              {showNewCat ? 'Cancel' : '+ Add'}
            </button>
          </div>
          {showNewCat && (
            <div className="p-3 mb-3 rounded-lg bg-[var(--bg-input)] flex gap-2">
              <input placeholder="Category name" className="input flex-1" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
              <select className="input w-28" value={catForm.type} onChange={e => setCatForm({ ...catForm, type: e.target.value })}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="savings">Savings</option>
              </select>
              <button className="btn-primary text-sm" onClick={createCategory} disabled={!catForm.name}>Add</button>
            </div>
          )}
          <div className="space-y-1">
            {categories.map(c => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded bg-[var(--bg-input)] text-sm group">
                <div className="flex items-center gap-2">
                  <span>{c.name}</span>
                  <span className={`badge text-xs ${c.type === 'income' ? 'badge-green' : c.type === 'savings' ? 'badge-blue' : 'badge-default'}`}>
                    {c.type}
                  </span>
                </div>
                <button className="btn-ghost text-xs opacity-0 group-hover:opacity-100 text-red-400" onClick={() => deleteCategory(c.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Budget */}
      {aiBudget && (
        <div className="card border-brand-600/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-brand-400">🤖 AI Budget Suggestion</h3>
            <button className="btn-ghost text-xs" onClick={() => setAiBudget(null)}>Close</button>
          </div>
          <p className="text-sm mb-2">Income Target: <span className="font-bold text-emerald-400">${aiBudget.income_target}</span></p>
          <p className="text-sm mb-3">Savings Rate: <span className="font-bold text-blue-400">{aiBudget.savings_rate_pct}%</span></p>
          <div className="space-y-1 mb-3">
            {aiBudget.budget_items.map((bi, i) => (
              <div key={i} className="p-2 rounded bg-[var(--bg-input)] text-sm">
                <div className="flex justify-between">
                  <span>{bi.category_name}</span>
                  <span className="font-medium">${bi.planned_amount}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{bi.rationale}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-3">💡 {aiBudget.insight}</p>
          <button className="btn-ghost text-xs" onClick={() => setAiBudget(null)}>Dismiss</button>
        </div>
      )}
    </div>
  );
}
