'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface Profile {
  id: string; name: string; domains: string[]; tone: string;
}

interface AgentSetting {
  agentId: string; enabled: boolean; provider: string | null; model: string | null;
}

const ALL_DOMAINS = ['studio', 'ironman', 'nutrition', 'finance'];
const ALL_AGENTS = [
  { id: 'studio_strategy_alignment', label: 'Studio Strategy Alignment', domain: 'studio' },
  { id: 'weekly_planning', label: 'Weekly Planning', domain: null },
  { id: 'daily_focus', label: 'Daily Focus', domain: null },
  { id: 'weekly_review', label: 'Weekly Review', domain: null },
  { id: 'ironman_weekly_plan', label: 'Ironman Weekly Plan', domain: 'ironman' },
  { id: 'nutrition_weekly_targets', label: 'Nutrition Weekly Targets', domain: 'nutrition' },
  { id: 'finance_monthly_budget', label: 'Finance Monthly Budget', domain: 'finance' },
];
const TONES = ['direct', 'encouraging', 'analytical', 'casual'];

export default function SettingsPage() {
  const { profileId } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agents, setAgents] = useState<AgentSetting[]>([]);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: '', domains: [] as string[], tone: 'direct' });

  useEffect(() => {
    Promise.all([
      api.get<Profile>(`/api/profiles/${profileId}`),
      api.get<AgentSetting[]>(`/api/profiles/${profileId}/agent-settings`),
    ]).then(([p, a]) => {
      setProfile(p);
      setForm({ name: p.name, domains: p.domains, tone: p.tone });
      setAgents(a);
    });
  }, [profileId]);

  const toggleDomain = (d: string) => {
    setForm(f => ({
      ...f,
      domains: f.domains.includes(d) ? f.domains.filter(x => x !== d) : [...f.domains, d],
    }));
  };

  const saveProfile = async () => {
    await api.patch(`/api/profiles/${profileId}`, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleAgent = async (agentId: string) => {
    const existing = agents.find(a => a.agentId === agentId);
    const newEnabled = existing ? !existing.enabled : true;
    await api.put(`/api/profiles/${profileId}/agent-settings`, {
      agentId,
      enabled: newEnabled,
      provider: existing?.provider || null,
      model: existing?.model || null,
    });
    setAgents(prev =>
      prev.map(a => a.agentId === agentId ? { ...a, enabled: newEnabled } : a)
        .concat(prev.find(a => a.agentId === agentId) ? [] : [{ agentId, enabled: newEnabled, provider: null, model: null }])
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">⚙️ Settings</h1>

      {/* Profile Settings */}
      <div className="card">
        <h2 className="font-semibold mb-3">Profile</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Tone</label>
            <select className="input" value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })}>
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Active Domains</label>
            <div className="flex gap-2 flex-wrap">
              {ALL_DOMAINS.map(d => (
                <button key={d} onClick={() => toggleDomain(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${
                    form.domains.includes(d) ? 'bg-brand-600 text-white' : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}>
                  {d === 'studio' && '🎮'} {d === 'ironman' && '🏊'} {d === 'nutrition' && '🥗'} {d === 'finance' && '💰'} {d}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-primary" onClick={saveProfile}>Save Profile</button>
            {saved && <span className="text-sm text-emerald-400">✓ Saved</span>}
          </div>
        </div>
      </div>

      {/* AI Agents */}
      <div className="card">
        <h2 className="font-semibold mb-3">🤖 AI Agents</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">Toggle agents on/off per profile. Disabled agents won&apos;t appear in the UI.</p>
        <div className="space-y-2">
          {ALL_AGENTS.map(agent => {
            const setting = agents.find(a => a.agentId === agent.id);
            const enabled = setting?.enabled ?? true;
            const domainActive = !agent.domain || form.domains.includes(agent.domain);
            return (
              <div key={agent.id} className={`flex items-center justify-between p-3 rounded-lg bg-[var(--bg-input)] ${!domainActive ? 'opacity-50' : ''}`}>
                <div>
                  <p className="text-sm font-medium">{agent.label}</p>
                  {agent.domain && <p className="text-xs text-[var(--text-dim)]">Requires: {agent.domain}</p>}
                </div>
                <button onClick={() => domainActive && toggleAgent(agent.id)}
                  className={`w-12 h-6 rounded-full relative transition ${enabled && domainActive ? 'bg-brand-600' : 'bg-[var(--bg)]'}`}
                  disabled={!domainActive}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${enabled && domainActive ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-900/50">
        <h2 className="font-semibold text-red-400 mb-3">⚠️ Danger Zone</h2>
        <p className="text-sm text-[var(--text-muted)] mb-3">Deleting this profile will remove all associated data permanently.</p>
        <button className="btn-danger text-sm" onClick={async () => {
          if (confirm('Are you sure? This cannot be undone.')) {
            await api.delete(`/api/profiles/${profileId}`);
            window.location.href = '/profiles';
          }
        }}>
          Delete Profile
        </button>
      </div>
    </div>
  );
}
