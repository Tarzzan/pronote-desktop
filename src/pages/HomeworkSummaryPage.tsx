import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3, AlertTriangle } from 'lucide-react';
import { addDays, isPast, isToday } from 'date-fns';
import { getClient } from '../lib/pronote/client';
import type { Homework } from '../types/pronote';

type SubjectStats = {
  subject: string;
  total: number;
  done: number;
};

const HomeworkSummaryPage: React.FC = () => {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const client = getClient();
      if (!client) {
        if (!cancelled) {
          setHomeworks([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const now = new Date();
        const data = await client.getHomework(addDays(now, -30), addDays(now, 60));
        if (!cancelled) setHomeworks(data);
      } catch (error) {
        console.error('[HomeworkSummaryPage] Erreur:', error);
        if (!cancelled) setHomeworks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const total = homeworks.length;
    const done = homeworks.filter((h) => h.done).length;
    const todo = total - done;
    const overdue = homeworks.filter((h) => !h.done && isPast(h.date) && !isToday(h.date)).length;
    return { total, done, todo, overdue };
  }, [homeworks]);

  const bySubject = useMemo<SubjectStats[]>(() => {
    const map = new Map<string, SubjectStats>();
    for (const hw of homeworks) {
      const subject = hw.subject.name || 'Matière';
      const current = map.get(subject) ?? { subject, total: 0, done: 0 };
      current.total += 1;
      if (hw.done) current.done += 1;
      map.set(subject, current);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [homeworks]);

  const completion = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Récapitulatif du cahier de textes</h1>
        <p className="text-sm text-gray-500 mt-1">Synthèse des devoirs (30 jours passés + 60 jours à venir)</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard title="Total" value={totals.total} icon={<BarChart3 className="w-5 h-5 text-blue-600" />} />
            <StatCard title="Faits" value={totals.done} icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} />
            <StatCard title="À faire" value={totals.todo} icon={<Clock3 className="w-5 h-5 text-amber-600" />} />
            <StatCard title="En retard" value={totals.overdue} icon={<AlertTriangle className="w-5 h-5 text-red-600" />} />
          </div>

          <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Taux de complétion</h2>
              <span className="text-sm font-semibold text-blue-700">{completion}%</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${completion}%` }} />
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Répartition par matière</h2>
            {bySubject.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune donnée disponible.</p>
            ) : (
              <div className="space-y-2">
                {bySubject.map((item) => {
                  const percent = item.total > 0 ? Math.round((item.done / item.total) * 100) : 0;
                  return (
                    <div key={item.subject} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-semibold text-gray-800">{item.subject}</span>
                        <span className="text-gray-600">{item.done}/{item.total} ({percent}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{title}</span>
      {icon}
    </div>
    <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
  </div>
);

export default HomeworkSummaryPage;
