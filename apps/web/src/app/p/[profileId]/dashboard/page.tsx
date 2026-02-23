'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface DashboardData {
  profile: { name: string; domainsEnabled: string[] };
  todayCheckin: { top1: string; energy: number; sleepHours: number; trainingPlanned: boolean } | null;
  dailyFocusResult: {
    top1_quality: string;
    overload_risk: string;
    fifteen_minute_starter: { task: string; definition_of_done: string };
    avoidance_warning: string;
    training_nudge: string;
  } | null;
  dailyFocusRunAt: string | null;
  week: {
    id: string;
    outcomes: Array<{
      id: string; title: string; status: string; domain: string; priority: number;
      initiative: { title: string } | null;
    }>;
  } | null;
  studioOutcomes: Array<{ id: string; title: string; status: string; priority: number }>;
  todaySessions: Array<{ discipline: string; durationMinutes: number }>;
  enduranceSummary: {
    swim: number; bike: number; run: number; totalMinutes: number; hasLongSession: boolean;
  };
  nutritionToday: { proteinMet: boolean; waterMet: boolean; mealQualityMet: boolean } | null;
  finance: {
    budget: { incomeTarget: number; savingsTarget: number } | null;
    totalIncome: number;
    totalExpense: number;
    plannedExpense: number;
  };
  alerts: Array<{ type: string; message: string; severity: 'info' | 'warning' | 'error' }>;
}

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  done: 'bg-emerald-500',
  dropped: 'bg-red-500',
};

export default function DashboardPage() {
  const { profileId } = useParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashboardData>(`/api/p/${profileId}/dashboard`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profileId]);

  if (loading) return <div className="text-[var(--text-muted)]">Loading dashboard...</div>;
  if (!data) return <div className="text-red-400">Failed to load dashboard</div>;

  const domains = data.profile.domainsEnabled;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📊 Dashboard</h1>
        <p className="text-[var(--text-muted)] text-sm">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, i) => (
            <div key={i} className={cn(
              'px-4 py-3 rounded-lg border text-sm',
              alert.severity === 'error' && 'bg-red-500/10 border-red-500/30 text-red-300',
              alert.severity === 'warning' && 'bg-amber-500/10 border-amber-500/30 text-amber-300',
              alert.severity === 'info' && 'bg-blue-500/10 border-blue-500/30 text-blue-300',
            )}>
              ⚠️ {alert.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Today's Studio Move */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">🎮 Today&apos;s Studio Move</h2>
            {!data.todayCheckin && (
              <Link href={`/p/${profileId}/daily`} className="btn-primary text-sm">
                Start Check-in →
              </Link>
            )}
          </div>

          {data.todayCheckin ? (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-brand-600/10 border border-brand-600/20">
                <p className="text-sm text-[var(--text-muted)]">Top 1 Priority</p>
                <p className="text-lg font-semibold text-brand-300">{data.todayCheckin.top1}</p>
                <div className="flex gap-4 mt-2 text-sm text-[var(--text-muted)]">
                  <span>⚡ Energy: {data.todayCheckin.energy}/10</span>
                  <span>😴 Sleep: {data.todayCheckin.sleepHours}h</span>
                  {data.todayCheckin.trainingPlanned && <span>🏃 Training planned</span>}
                </div>
              </div>

              {data.dailyFocusResult && (
                <div className="p-4 rounded-lg bg-emerald-600/10 border border-emerald-600/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-emerald-400">⏱️ 15-Minute Starter Step</p>
                    {data.dailyFocusRunAt && (
                      <span className="text-xs text-[var(--text-dim)]">
                        AI ran {new Date(data.dailyFocusRunAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <p className="font-medium">{data.dailyFocusResult.fifteen_minute_starter.task}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    ✅ Done when: {data.dailyFocusResult.fifteen_minute_starter.definition_of_done}
                  </p>
                  <div className="flex gap-4 mt-3 text-xs">
                    <span className={cn(
                      'badge',
                      data.dailyFocusResult.top1_quality === 'strong' ? 'badge-studio' :
                      data.dailyFocusResult.top1_quality === 'ok' ? 'badge-nutrition' : 'bg-red-600/20 text-red-400'
                    )}>
                      Top1: {data.dailyFocusResult.top1_quality}
                    </span>
                    <span className={cn(
                      'badge',
                      data.dailyFocusResult.overload_risk === 'low' ? 'badge-studio' :
                      data.dailyFocusResult.overload_risk === 'medium' ? 'badge-nutrition' : 'bg-red-600/20 text-red-400'
                    )}>
                      Overload: {data.dailyFocusResult.overload_risk}
                    </span>
                  </div>
                  {data.dailyFocusResult.avoidance_warning && (
                    <p className="text-sm text-amber-400 mt-2">⚠️ {data.dailyFocusResult.avoidance_warning}</p>
                  )}
                  {data.dailyFocusResult.training_nudge && (
                    <p className="text-sm text-emerald-400 mt-1">🏋️ {data.dailyFocusResult.training_nudge}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[var(--text-muted)]">No check-in yet today. Start your morning ritual to unlock AI guidance.</p>
          )}
        </div>

        {/* 2. Studio Outcomes Progress */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">🎯 Studio Outcomes</h2>
            <Link href={`/p/${profileId}/weekly`} className="btn-ghost text-xs">View Week →</Link>
          </div>
          {data.studioOutcomes.length > 0 ? (
            <div className="space-y-2">
              {data.studioOutcomes.map(o => (
                <div key={o.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-input)]">
                  <div className={cn('w-2 h-2 rounded-full', STATUS_COLORS[o.status] || 'bg-gray-500')} />
                  <span className="text-sm flex-1">{o.title}</span>
                  <span className="text-xs text-[var(--text-dim)] capitalize">{o.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No studio outcomes this week</p>
          )}
        </div>

        {/* 3. Training / Endurance Summary */}
        {domains.includes('ironman') && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">🏊 Training This Week</h2>
              <Link href={`/p/${profileId}/training`} className="btn-ghost text-xs">Log →</Link>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center p-3 rounded-lg bg-[var(--bg-input)]">
                <p className="text-2xl font-bold text-blue-400">{data.enduranceSummary.swim}</p>
                <p className="text-xs text-[var(--text-muted)]">🏊 Swim</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-[var(--bg-input)]">
                <p className="text-2xl font-bold text-green-400">{data.enduranceSummary.bike}</p>
                <p className="text-xs text-[var(--text-muted)]">🚴 Bike</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-[var(--bg-input)]">
                <p className="text-2xl font-bold text-orange-400">{data.enduranceSummary.run}</p>
                <p className="text-xs text-[var(--text-muted)]">🏃 Run</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Total: {data.enduranceSummary.totalMinutes} min
              {data.enduranceSummary.hasLongSession && <span className="text-emerald-400 ml-2">✓ Long session done</span>}
            </p>
            {data.todaySessions.length > 0 && (
              <p className="text-sm text-emerald-400 mt-1">
                Today: {data.todaySessions.map(s => `${s.discipline} (${s.durationMinutes}min)`).join(', ')}
              </p>
            )}
          </div>
        )}

        {/* 4. Nutrition Today */}
        {domains.includes('nutrition') && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">🥗 Nutrition Today</h2>
              <Link href={`/p/${profileId}/nutrition`} className="btn-ghost text-xs">Log →</Link>
            </div>
            {data.nutritionToday ? (
              <div className="flex gap-4">
                <div className={cn('p-3 rounded-lg flex-1 text-center', data.nutritionToday.proteinMet ? 'bg-emerald-600/20' : 'bg-[var(--bg-input)]')}>
                  <p className="text-lg">{data.nutritionToday.proteinMet ? '✅' : '❌'}</p>
                  <p className="text-xs text-[var(--text-muted)]">Protein</p>
                </div>
                <div className={cn('p-3 rounded-lg flex-1 text-center', data.nutritionToday.waterMet ? 'bg-emerald-600/20' : 'bg-[var(--bg-input)]')}>
                  <p className="text-lg">{data.nutritionToday.waterMet ? '✅' : '❌'}</p>
                  <p className="text-xs text-[var(--text-muted)]">Water</p>
                </div>
                <div className={cn('p-3 rounded-lg flex-1 text-center', data.nutritionToday.mealQualityMet ? 'bg-emerald-600/20' : 'bg-[var(--bg-input)]')}>
                  <p className="text-lg">{data.nutritionToday.mealQualityMet ? '✅' : '❌'}</p>
                  <p className="text-xs text-[var(--text-muted)]">Meals</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No nutrition log today</p>
            )}
          </div>
        )}

        {/* 5. Finance Month Health */}
        {domains.includes('finance') && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">💰 Finance This Month</h2>
              <Link href={`/p/${profileId}/finance`} className="btn-ghost text-xs">Details →</Link>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-muted)]">Income</span>
                <span className="text-emerald-400 font-medium">
                  €{data.finance.totalIncome.toLocaleString()} / €{data.finance.budget?.incomeTarget?.toLocaleString() || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-muted)]">Spent</span>
                <span className="text-red-400 font-medium">
                  €{data.finance.totalExpense.toLocaleString()} / €{data.finance.plannedExpense.toLocaleString()}
                </span>
              </div>
              {data.finance.budget && (
                <div className="w-full bg-[var(--bg-input)] rounded-full h-2">
                  <div
                    className={cn('h-2 rounded-full', data.finance.totalExpense > data.finance.plannedExpense ? 'bg-red-500' : 'bg-emerald-500')}
                    style={{ width: `${Math.min(100, data.finance.plannedExpense > 0 ? (data.finance.totalExpense / data.finance.plannedExpense) * 100 : 0)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
