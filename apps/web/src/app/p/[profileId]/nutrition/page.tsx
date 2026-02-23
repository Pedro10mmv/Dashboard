'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { todayISO } from '@/lib/utils';

interface NutritionTarget {
  id: string; weekId: string; proteinGrams: number; waterLitres: number; mealQualityRule: string;
}

interface NutritionLog {
  id: string; logDate: string; proteinHit: boolean; waterHit: boolean; mealQualityHit: boolean; notes: string | null;
}

interface AITargets {
  protein_grams: number; water_litres: number; meal_quality_rule: string; reasoning: string;
}

export default function NutritionPage() {
  const { profileId } = useParams();
  const [target, setTarget] = useState<NutritionTarget | null>(null);
  const [todayLog, setTodayLog] = useState<NutritionLog | null>(null);
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [editingTarget, setEditingTarget] = useState(false);
  const [aiTargets, setAiTargets] = useState<AITargets | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [targetForm, setTargetForm] = useState({ proteinGrams: 150, waterLitres: 3, mealQualityRule: '2 out of 3 meals whole-food based' });
  const [logForm, setLogForm] = useState({ proteinHit: false, waterHit: false, mealQualityHit: false, notes: '' });

  const load = async () => {
    try {
      const t = await api.get<NutritionTarget>(`/api/p/${profileId}/nutrition/targets`);
      setTarget(t);
      setTargetForm({ proteinGrams: t.proteinGrams, waterLitres: t.waterLitres, mealQualityRule: t.mealQualityRule });
    } catch { /* no target yet */ }
    try {
      const l = await api.get<NutritionLog>(`/api/p/${profileId}/nutrition/logs/today`);
      setTodayLog(l);
      setLogForm({ proteinHit: l.proteinHit, waterHit: l.waterHit, mealQualityHit: l.mealQualityHit, notes: l.notes || '' });
    } catch { /* no log today */ }
    try {
      const all = await api.get<NutritionLog[]>(`/api/p/${profileId}/nutrition/logs`);
      setLogs(all);
    } catch { /* */ }
  };

  useEffect(() => { load(); }, [profileId]);

  const saveTarget = async () => {
    const t = await api.put<NutritionTarget>(`/api/p/${profileId}/nutrition/targets`, targetForm);
    setTarget(t);
    setEditingTarget(false);
  };

  const saveLog = async () => {
    if (todayLog) {
      const l = await api.patch<NutritionLog>(`/api/p/${profileId}/nutrition/logs/${todayLog.id}`, logForm);
      setTodayLog(l);
    } else {
      const l = await api.post<NutritionLog>(`/api/p/${profileId}/nutrition/logs`, { ...logForm, logDate: todayISO() });
      setTodayLog(l);
    }
    load();
  };

  const generateTargets = async () => {
    setAiLoading(true);
    try {
      const res = await api.post<{ result: AITargets }>(`/api/p/${profileId}/nutrition/ai/targets`);
      setAiTargets(res.result);
    } catch (err) { console.error(err); }
    setAiLoading(false);
  };

  const applyAiTargets = () => {
    if (!aiTargets) return;
    setTargetForm({ proteinGrams: aiTargets.protein_grams, waterLitres: aiTargets.water_litres, mealQualityRule: aiTargets.meal_quality_rule });
    setEditingTarget(true);
    setAiTargets(null);
  };

  // Streak calc
  const streak = (() => {
    let count = 0;
    const sorted = [...logs].sort((a, b) => b.logDate.localeCompare(a.logDate));
    for (const l of sorted) {
      if (l.proteinHit && l.waterHit && l.mealQualityHit) count++;
      else break;
    }
    return count;
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🥗 Nutrition</h1>
        <button className="btn-primary text-sm" onClick={generateTargets} disabled={aiLoading}>
          {aiLoading ? 'Generating...' : '🤖 AI Targets'}
        </button>
      </div>

      {/* Weekly Targets */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Weekly Targets</h2>
          <button className="btn-ghost text-xs" onClick={() => setEditingTarget(!editingTarget)}>
            {editingTarget ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editingTarget ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label">Protein (g/day)</label>
                <input type="number" className="input" value={targetForm.proteinGrams} onChange={e => setTargetForm({ ...targetForm, proteinGrams: Number(e.target.value) })} />
              </div>
              <div className="flex-1">
                <label className="label">Water (L/day)</label>
                <input type="number" step="0.5" className="input" value={targetForm.waterLitres} onChange={e => setTargetForm({ ...targetForm, waterLitres: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="label">Meal Quality Rule</label>
              <input className="input" value={targetForm.mealQualityRule} onChange={e => setTargetForm({ ...targetForm, mealQualityRule: e.target.value })} />
            </div>
            <button className="btn-primary" onClick={saveTarget}>Save Targets</button>
          </div>
        ) : target ? (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-[var(--bg-input)]">
              <p className="text-2xl font-bold text-brand-400">{target.proteinGrams}g</p>
              <p className="text-xs text-[var(--text-muted)]">Protein/day</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-input)]">
              <p className="text-2xl font-bold text-blue-400">{target.waterLitres}L</p>
              <p className="text-xs text-[var(--text-muted)]">Water/day</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-input)]">
              <p className="text-xl font-bold text-emerald-400">🍽</p>
              <p className="text-xs text-[var(--text-muted)]">{target.mealQualityRule}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No targets set. Click Edit or let AI suggest targets.</p>
        )}
      </div>

      {/* Today's Log */}
      <div className="card">
        <h2 className="font-semibold mb-3">📋 Today&apos;s Log</h2>
        <div className="space-y-3">
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={logForm.proteinHit} onChange={e => setLogForm({ ...logForm, proteinHit: e.target.checked })}
                className="w-5 h-5 rounded border-[var(--border)] accent-brand-500" />
              <span>🥩 Protein Hit</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={logForm.waterHit} onChange={e => setLogForm({ ...logForm, waterHit: e.target.checked })}
                className="w-5 h-5 rounded border-[var(--border)] accent-blue-500" />
              <span>💧 Water Hit</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={logForm.mealQualityHit} onChange={e => setLogForm({ ...logForm, mealQualityHit: e.target.checked })}
                className="w-5 h-5 rounded border-[var(--border)] accent-emerald-500" />
              <span>🍽 Meal Quality Hit</span>
            </label>
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" placeholder="e.g., Missed lunch protein..." value={logForm.notes} onChange={e => setLogForm({ ...logForm, notes: e.target.value })} />
          </div>
          <button className="btn-primary" onClick={saveLog}>
            {todayLog ? 'Update Log' : 'Save Log'}
          </button>
        </div>
      </div>

      {/* Streak */}
      <div className="card text-center">
        <p className="text-4xl font-bold text-brand-400">{streak}</p>
        <p className="text-sm text-[var(--text-muted)]">day streak (all 3 targets hit)</p>
      </div>

      {/* Recent Logs */}
      {logs.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-3">📅 Recent Logs</h2>
          <div className="space-y-1">
            {logs.slice(0, 14).map(l => (
              <div key={l.id} className="flex items-center gap-3 p-2 rounded bg-[var(--bg-input)] text-sm">
                <span className="w-24 text-[var(--text-muted)]">{new Date(l.logDate).toLocaleDateString()}</span>
                <span>{l.proteinHit ? '✅' : '❌'} Protein</span>
                <span>{l.waterHit ? '✅' : '❌'} Water</span>
                <span>{l.mealQualityHit ? '✅' : '❌'} Meals</span>
                {l.notes && <span className="text-[var(--text-dim)] ml-auto truncate max-w-48">{l.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Targets */}
      {aiTargets && (
        <div className="card border-brand-600/30">
          <h3 className="font-semibold text-brand-400 mb-2">🤖 AI Suggested Targets</h3>
          <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
            <div className="p-2 rounded bg-[var(--bg-input)] text-center">
              <p className="font-bold">{aiTargets.protein_grams}g</p>
              <p className="text-xs text-[var(--text-muted)]">Protein</p>
            </div>
            <div className="p-2 rounded bg-[var(--bg-input)] text-center">
              <p className="font-bold">{aiTargets.water_litres}L</p>
              <p className="text-xs text-[var(--text-muted)]">Water</p>
            </div>
            <div className="p-2 rounded bg-[var(--bg-input)] text-center">
              <p className="text-xs">{aiTargets.meal_quality_rule}</p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-3">{aiTargets.reasoning}</p>
          <div className="flex gap-2">
            <button className="btn-primary text-sm" onClick={applyAiTargets}>Apply Targets</button>
            <button className="btn-ghost text-sm" onClick={() => setAiTargets(null)}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}
