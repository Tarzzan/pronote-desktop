import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, addWeeks, format, isSameDay, startOfWeek, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getClient } from '../lib/pronote/client';
import type { Lesson } from '../types/pronote';

type WeekData = {
  weekStart: Date;
  lessons: Lesson[];
};

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];

const TimetableMultiPage: React.FC = () => {
  const [blockStart, setBlockStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStarts = useMemo(
    () => Array.from({ length: 4 }, (_, i) => addWeeks(blockStart, i)),
    [blockStart]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const client = getClient();
      if (!client) {
        if (!cancelled) {
          setWeeks([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const loaded = await Promise.all(
          weekStarts.map(async (weekStart) => {
            const lessons = await client.getLessons(weekStart, addDays(weekStart, 6));
            return { weekStart, lessons };
          })
        );
        if (!cancelled) setWeeks(loaded);
      } catch (error) {
        console.error('[TimetableMultiPage] Erreur:', error);
        if (!cancelled) setWeeks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [weekStarts]);

  const getLessonCountForDay = (lessons: Lesson[], day: Date): number =>
    lessons.filter((lesson) => isSameDay(lesson.start, day)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planning multisemaine</h1>
          <p className="text-sm text-gray-500 mt-1">Vue sur 4 semaines glissantes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBlockStart(subWeeks(blockStart, 4))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Bloc précédent"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setBlockStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-4 py-2 text-sm font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            Aujourd&apos;hui
          </button>
          <button
            onClick={() => setBlockStart(addWeeks(blockStart, 4))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Bloc suivant"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : weeks.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune donnée disponible pour cette période.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {weeks.map(({ weekStart, lessons }) => {
            const total = lessons.length;
            const cancelled = lessons.filter((l) => l.is_cancelled).length;
            const active = total - cancelled;

            return (
              <section
                key={format(weekStart, 'yyyy-MM-dd')}
                className="bg-white border border-gray-200 rounded-xl shadow-sm p-4"
              >
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Semaine du {format(weekStart, 'd MMM', { locale: fr })}
                    </h2>
                    <p className="text-xs text-gray-500">
                      au {format(addDays(weekStart, 4), 'd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{active} cours</div>
                    {cancelled > 0 && <div className="text-xs text-red-600">{cancelled} annulé(s)</div>}
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {WEEK_DAYS.map((dayLabel, i) => {
                    const dayDate = addDays(weekStart, i);
                    const count = getLessonCountForDay(lessons, dayDate);
                    return (
                      <div key={dayLabel} className="rounded-lg border border-gray-100 bg-gray-50 p-2 text-center">
                        <div className="text-xs font-semibold text-gray-600">{dayLabel}</div>
                        <div className="text-lg font-bold text-blue-700 mt-1">{count}</div>
                        <div className="text-[11px] text-gray-400">
                          {format(dayDate, 'd/MM')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TimetableMultiPage;
