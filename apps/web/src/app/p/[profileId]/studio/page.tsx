'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

interface StudioPlan {
  mission: string; definitionOfSuccess: string; values: string;
  positioning: string; businessAssumptions: string; notNowList: string;
}

export default function StudioPage() {
  const { profileId } = useParams();
  const [plan, setPlan] = useState<StudioPlan | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<StudioPlan>({ mission: '', definitionOfSuccess: '', values: '', positioning: '', businessAssumptions: '', notNowList: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<StudioPlan>(`/api/p/${profileId}/studio/plan`).then(p => { setPlan(p); setForm(p); });
  }, [profileId]);

  const save = async () => {
    setSaving(true);
    const updated = await api.put<StudioPlan>(`/api/p/${profileId}/studio/plan`, form);
    setPlan(updated);
    setEditing(false);
    setSaving(false);
  };

  const fields: Array<{ key: keyof StudioPlan; label: string; icon: string }> = [
    { key: 'mission', label: 'Mission', icon: '🎯' },
    { key: 'definitionOfSuccess', label: 'Definition of Success', icon: '🏆' },
    { key: 'values', label: 'Values', icon: '💎' },
    { key: 'positioning', label: 'Positioning', icon: '📍' },
    { key: 'businessAssumptions', label: 'Business Assumptions', icon: '📊' },
    { key: 'notNowList', label: 'Not-Now List', icon: '🚫' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🎮 Studio Plan</h1>
        <div className="flex gap-2">
          <Link href={`/p/${profileId}/studio/initiatives`} className="btn-secondary text-sm">Initiatives →</Link>
          {!editing ? (
            <button className="btn-primary text-sm" onClick={() => setEditing(true)}>Edit</button>
          ) : (
            <>
              <button className="btn-primary text-sm" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button className="btn-secondary text-sm" onClick={() => { setEditing(false); if (plan) setForm(plan); }}>Cancel</button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {fields.map(f => (
          <div key={f.key} className="card">
            <h3 className="font-semibold text-sm text-[var(--text-muted)] mb-2">{f.icon} {f.label}</h3>
            {editing ? (
              <textarea
                className="input min-h-[80px]"
                value={form[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{plan?.[f.key] || <span className="text-[var(--text-dim)] italic">Not set</span>}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
