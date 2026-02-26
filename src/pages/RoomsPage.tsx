import React, { useEffect, useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { Building2, Calendar, Clock3 } from 'lucide-react';
import { getClient } from '../lib/pronote/client';
import type { Lesson } from '../types/pronote';

type RoomStat = {
  room: string;
  lessons: number;
  cancelled: number;
  subjects: number;
  groups: number;
  hours: number;
};

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

const RoomsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const client = getClient();
      if (!client) {
        if (!cancelled) {
          setLessons([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const today = new Date();
        const data = await client.getLessons(addDays(today, -7), addDays(today, 30));
        if (!cancelled) setLessons(data);
      } catch (error) {
        console.error('[RoomsPage] Erreur:', error);
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

  const stats = useMemo<RoomStat[]>(() => {
    const map = new Map<string, {
      lessons: number;
      cancelled: number;
      subjects: Set<string>;
      groups: Set<string>;
      hours: number;
    }>();

    for (const lesson of lessons) {
      const names = [
        ...(lesson.classroom ? [lesson.classroom] : []),
        ...((lesson.classrooms || []).filter(Boolean)),
      ];
      const durationHours = Math.max(0, (lesson.end.getTime() - lesson.start.getTime()) / (1000 * 60 * 60));
      const subjectName = lesson.subject?.name || 'Cours';
      const groups = [
        ...(lesson.group_name ? [lesson.group_name] : []),
        ...((lesson.group_names || []).filter(Boolean)),
      ];

      for (const rawName of names) {
        const room = normalize(rawName);
        if (!room) continue;
        const current = map.get(room) || {
          lessons: 0,
          cancelled: 0,
          subjects: new Set<string>(),
          groups: new Set<string>(),
          hours: 0,
        };
        current.lessons += 1;
        current.hours += durationHours;
        if (lesson.is_cancelled) current.cancelled += 1;
        current.subjects.add(subjectName);
        for (const group of groups) {
          const clean = normalize(group);
          if (clean) current.groups.add(clean);
        }
        map.set(room, current);
      }
    }

    return Array.from(map.entries())
      .map(([room, data]) => ({
        room,
        lessons: data.lessons,
        cancelled: data.cancelled,
        subjects: data.subjects.size,
        groups: data.groups.size,
        hours: Math.round(data.hours * 10) / 10,
      }))
      .sort((a, b) => b.lessons - a.lessons || a.room.localeCompare(b.room, 'fr'));
  }, [lessons]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stats;
    return stats.filter((item) => item.room.toLowerCase().includes(q));
  }, [query, stats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recherche de salles</h1>
          <p className="text-sm text-gray-500 mt-1">Occupation estimée sur la période en cours</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrer par salle (ex: 207)"
          className="w-full sm:w-72 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard title="Salles détectées" value={stats.length} icon={<Building2 className="w-5 h-5 text-blue-700" />} />
            <StatCard title="Cours analysés" value={lessons.length} icon={<Calendar className="w-5 h-5 text-indigo-700" />} />
            <StatCard title="Résultats filtrés" value={filtered.length} icon={<Clock3 className="w-5 h-5 text-emerald-700" />} />
          </div>

          <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Salles et activité</h2>
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune salle trouvée pour ce filtre.</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((item) => (
                  <article key={item.room} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-gray-900">Salle {item.room}</div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {item.lessons} cours
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 flex flex-wrap gap-2">
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                        {item.hours} h
                      </span>
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                        {item.subjects} matière(s)
                      </span>
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                        {item.groups} classe(s)
                      </span>
                      {item.cancelled > 0 && (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full">
                          {item.cancelled} annulé(s)
                        </span>
                      )}
                    </div>
                  </article>
                ))}
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

export default RoomsPage;
