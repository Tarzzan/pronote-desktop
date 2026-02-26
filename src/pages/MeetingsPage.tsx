import React, { useEffect, useMemo, useState } from 'react';
import { addDays, format, setHours, setMinutes, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarClock, Users } from 'lucide-react';
import { getClient } from '../lib/pronote/client';
import type { Lesson } from '../types/pronote';

type Slot = {
  start: Date;
  end: Date;
};

const MeetingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const client = getClient();
      if (!client) {
        if (!cancelled) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const now = new Date();
        const data = await client.getLessons(now, addDays(now, 14));
        if (!cancelled) setLessons(data);
      } catch (error) {
        console.error('[MeetingsPage] Erreur:', error);
        if (!cancelled) setLessons([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectableDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i)),
    []
  );

  const freeSlots = useMemo<Slot[]>(() => {
    const dayStart = setMinutes(setHours(startOfDay(selectedDay), 8), 0);
    const dayEnd = setMinutes(setHours(startOfDay(selectedDay), 18), 0);

    const dayLessons = lessons
      .filter((l) => format(l.start, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd'))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const slots: Slot[] = [];
    let cursor = dayStart;
    for (const lesson of dayLessons) {
      if (lesson.start.getTime() - cursor.getTime() >= 25 * 60 * 1000) {
        slots.push({ start: cursor, end: lesson.start });
      }
      if (lesson.end > cursor) cursor = lesson.end;
    }

    if (dayEnd.getTime() - cursor.getTime() >= 25 * 60 * 1000) {
      slots.push({ start: cursor, end: dayEnd });
    }

    return slots;
  }, [lessons, selectedDay]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rencontres Parents/Profs</h1>
        <p className="text-sm text-gray-500 mt-1">Créneaux suggérés selon les disponibilités de l&apos;emploi du temps</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {selectableDays.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => setSelectedDay(day)}
            className={`px-3 py-1.5 text-sm rounded-lg border ${
              format(day, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd')
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {format(day, 'EEE d MMM', { locale: fr })}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3 inline-flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-blue-600" />
            Disponibilités du {format(selectedDay, 'EEEE d MMMM yyyy', { locale: fr })}
          </h2>

          {freeSlots.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun créneau libre détecté sur cette journée.</p>
          ) : (
            <div className="space-y-2">
              {freeSlots.map((slot, index) => (
                <article key={`${slot.start.toISOString()}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-gray-900">
                      {format(slot.start, 'HH:mm')} - {format(slot.end, 'HH:mm')}
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      recommandé
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default MeetingsPage;
