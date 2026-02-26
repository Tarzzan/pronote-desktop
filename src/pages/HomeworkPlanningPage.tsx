import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { addDays, format, isPast, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getClient } from '../lib/pronote/client';
import type { Homework } from '../types/pronote';

const WINDOW_DAYS = 30;

const HomeworkPlanningPage: React.FC = () => {
  const [startDate, setStartDate] = useState(() => new Date());
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
        const data = await client.getHomework(startDate, addDays(startDate, WINDOW_DAYS));
        if (!cancelled) setHomeworks(data);
      } catch (error) {
        console.error('[HomeworkPlanningPage] Erreur:', error);
        if (!cancelled) setHomeworks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [startDate]);

  const grouped = useMemo(() => {
    const map = new Map<string, Homework[]>();
    for (const hw of homeworks) {
      const key = format(hw.date, 'yyyy-MM-dd');
      const current = map.get(key) ?? [];
      current.push(hw);
      map.set(key, current);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [homeworks]);

  const getDayLabel = (dateKey: string): string => {
    const date = new Date(dateKey);
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return 'Demain';
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planning des devoirs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fenêtre de {WINDOW_DAYS} jours
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStartDate(addDays(startDate, -WINDOW_DAYS))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Période précédente"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setStartDate(new Date())}
            className="px-4 py-2 text-sm font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            Aujourd&apos;hui
          </button>
          <button
            onClick={() => setStartDate(addDays(startDate, WINDOW_DAYS))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Période suivante"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun devoir sur cette période.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([dateKey, entries]) => {
            const date = new Date(dateKey);
            const late = isPast(date) && !isToday(date);
            return (
              <section key={dateKey} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 mb-3">
                  <h2 className={`text-sm font-semibold uppercase tracking-wide ${late ? 'text-red-700' : 'text-gray-900'}`}>
                    {getDayLabel(dateKey)}
                  </h2>
                  <span className="text-xs text-gray-500">{entries.length} devoir(s)</span>
                </div>
                <div className="space-y-2">
                  {entries.map((hw) => (
                    <div key={hw.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-sm text-blue-700">{hw.subject.name}</div>
                        {hw.done ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Fait
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
                            <Circle className="w-3.5 h-3.5" />
                            À faire
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{hw.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HomeworkPlanningPage;
