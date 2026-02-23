'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Outcome {
  id: string; domain: string; title: string; definitionOfDone: string;
  priority: number; timeBudgetMinutes: number | null; status: string;
  initiativeId: string | null; milestoneId: string | null;
  initiative: { title: string } | null;
}

interface Week { id: string; weekStartDate: string; outcomes: Outcome[]; }

interface AIResult {
  scope_verdict?: string;
  rewritten_outcomes?: Array<{ title: string; definition_of_done: string; risk: string }>;
  alignment_score?: number;
  recommended_week_focus?: string;
  one_warning?: string;
  score?: { outcomes_completed: number; outcomes_total: number; consistency_grade: string };
  what_worked?: string[];
  what_failed?: string[];
}

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-500', in_progress: 'bg-blue-500', done: 'bg-emerald-500', dropped: 'bg-red-500',
};

const DOMAIN_BADGES: Record<string, string> = {
  studio: 'badge-studio', ironman: 'badge-ironman', nutrition: 'badge-nutrition', finance: 'badge-finance', other: 'badge-other',
};

export default function WeeklyPage() {
  const { profileId } = useParams();
  const [week, setWeek] = useState<Week | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({
    domain: 'studio', title: '', definitionOfDone: '', priority: 2, timeBudgetMinutes: 120, status: 'not_started',
  });

  const load = () => {
    api.get<Week>(`/api/p/${profileId}/weeks/current`)
      .then(setWeek)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [profileId]);

  const addOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!week) return;
    await api.post(`/api/p/${profileId}/weeks/${week.id}/outcomes`, form);
    setForm({ domain: 'studio', title: '', definitionOfDone: '', priority: 2, timeBudgetMinutes: 120, status: 'not_started' });
    setShowAdd(false);
    load();
  };

  const updateStatus = async (outcomeId: string, status: string) => {
    await api.patch(`/api/p/${profileId}/outcomes/${outcomeId}`, { status });
    load();
  };

  const deleteOutcome = async (outcomeId: string) => {
    await api.delete(`/api/p/${profileId}/outcomes/${outcomeId}`);
    load();
  };

  const runAI = async (agent: string) => {
    if (!week) return;
    setAiLoading(true);
    try {
      const res = await api.post<{ result: AIResult }>(`/api/p/${profileId}/weeks/${week.id}/ai/${agent}`);
      setAiResult(res.result);
    } catch (err) {
      console.error(err);
    }
    setAiLoading(false);
  };

  if (loading) return <div className="text-[var(--text-muted)]">Loading...</div>;
  if (!week) return <div className="text-red-400">No week data</div>;

  const completed = week.outcomes.filter(o => o.status === 'done').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📋 Weekly Plan</h1>
          <p className="text-[var(--text-muted)] text-sm">
            Week of {new Date(week.weekStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {completed}/{week.outcomes.length} done
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm" onClick={() => runAI('weekly-planning')} disabled={aiLoading}>
            {aiLoading ? '...' : '🤖 AI Plan'}
          </button>
          <button className="btn-secondary text-sm" onClick={() => runAI('studio-alignment')} disabled={aiLoading}>
            🎯 Alignment
          </button>
          <button className="btn-secondary text-sm" onClick={() => runAI('weekly-review')} disabled={aiLoading}>
            📝 Review
          </button>
          <button className="btn-primary text-sm" onClick={() => setShowAdd(!showAdd)}>+ Outcome</button>
        </div>
      </div>

      {/* AI Result Sidebar */}
      {aiResult && (
        <div className="card border-brand-600/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-brand-400">🤖 AI Analysis</h3>
            <button className="btn-ghost text-xs" onClick={() => setAiResult(null)}>Close</button>
          </div>
          {aiResult.scope_verdict && (
            <p className="text-sm mb-2">Scope: <span className={cn('font-medium', aiResult.scope_verdict === 'ok' ? 'text-emerald-400' : 'text-amber-400')}>{aiResult.scope_verdict}</span></p>
          )}
          {aiResult.alignment_score !== undefined && (
            <p className="text-sm mb-2">Alignment: <span className="font-medium text-brand-400">{aiResult.alignment_score}%</span></p>
          )}
          {aiResult.recommended_week_focus && (
            <p className="text-sm mb-2 text-[var(--text-muted)]">Focus: {aiResult.recommended_week_focus}</p>
          )}
          {aiResult.one_warning && (
            <p className="text-sm text-amber-400">⚠️ {aiResult.one_warning}</p>
          )}
          {aiResult.score && (
            <div className="space-y-1 text-sm">
              <p>Completed: {aiResult.score.outcomes_completed}/{aiResult.score.outcomes_total}</p>
              <p>Grade: <span className="font-bold text-brand-400">{aiResult.score.consistency_grade}</span></p>
            </div>
          )}
          {aiResult.what_worked && aiResult.what_worked.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-emerald-400 font-medium">What worked:</p>
              {aiResult.what_worked.map((w, i) => <p key={i} className="text-xs text-[var(--text-muted)]">• {w}</p>)}
            </div>
          )}
          {aiResult.what_failed && aiResult.what_failed.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-red-400 font-medium">What failed:</p>
              {aiResult.what_failed.map((w, i) => <p key={i} className="text-xs text-[var(--text-muted)]">• {w}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Add Outcome Form */}
      {showAdd && (
        <form onSubmit={addOutcome} className="card space-y-3">
          <div className="flex gap-3">
            <div className="w-32">
              <label className="label">Domain</label>
              <select className="input" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })}>
                {['studio', 'ironman', 'nutrition', 'finance', 'other'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Title</label>
              <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Definition of Done (required)</label>
            <textarea className="input" value={form.definitionOfDone} onChange={e => setForm({ ...form, definitionOfDone: e.target.value })} required />
          </div>
          <div className="flex gap-3">
            <div className="w-24">
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })}>
                <option value={1}>P1</option><option value={2}>P2</option><option value={3}>P3</option>
              </select>
            </div>
            <div className="w-32">
              <label className="label">Time (min)</label>
              <input type="number" className="input" value={form.timeBudgetMinutes} onChange={e => setForm({ ...form, timeBudgetMinutes: Number(e.target.value) })} />
            </div>
          </div>
          <button type="submit" className="btn-primary">Add Outcome</button>
        </form>
      )}

      {/* Outcomes List */}
      <div className="space-y-2">
        {week.outcomes.map(o => (
          <div key={o.id} className="card flex items-start gap-3 group">
            <div className={cn('w-2 h-2 rounded-full mt-2 shrink-0', STATUS_COLORS[o.status])} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('badge text-[10px]', DOMAIN_BADGES[o.domain])}>{o.domain}</span>
                <span className="text-xs text-[var(--text-dim)]">P{o.priority}</span>
                {o.timeBudgetMinutes && <span className="text-xs text-[var(--text-dim)]">{o.timeBudgetMinutes}m</span>}
              </div>
              <p className="font-medium text-sm mt-1">{o.title}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">✅ {o.definitionOfDone}</p>
              {o.initiative && <p className="text-xs text-brand-400/70 mt-0.5">↗ {o.initiative.title}</p>}
            </div>
            <div className="flex gap-1 items-center">
              <select
                className="input text-xs py-1 px-2 w-28"
                value={o.status}
                onChange={e => updateStatus(o.id, e.target.value)}
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="dropped">Dropped</option>
              </select>
              <button onClick={() => deleteOutcome(o.id)} className="text-red-400 opacity-0 group-hover:opacity-100 text-xs p-1">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
