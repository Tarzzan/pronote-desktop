import React, { useEffect, useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { BarChart3, BookOpenCheck, Clock3 } from 'lucide-react';
import { getClient } from '../lib/pronote/client';
import type { Homework, Lesson } from '../types/pronote';

type SubjectProgress = {
  subject: string;
  lessons: number;
  homework: number;
  homeworkDoneRate: number;
};

const ProgressionsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);

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
        const [lessonsData, homeworkData] = await Promise.all([
          client.getLessons(addDays(now, -30), addDays(now, 30)),
          client.getHomework(addDays(now, -30), addDays(now, 30)),
        ]);
        if (!cancelled) {
          setLessons(lessonsData);
          setHomeworks(homeworkData);
        }
      } catch (error) {
        console.error('[ProgressionsPage] Erreur:', error);
        if (!cancelled) {
          setLessons([]);
          setHomeworks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const progress = useMemo<SubjectProgress[]>(() => {
    const map = new Map<string, { lessons: number; hwTotal: number; hwDone: number }>();

    for (const lesson of lessons) {
      const subject = lesson.subject?.name || 'Matière';
      const row = map.get(subject) ?? { lessons: 0, hwTotal: 0, hwDone: 0 };
      row.lessons += 1;
      map.set(subject, row);
    }

    for (const hw of homeworks) {
      const subject = hw.subject.name || 'Matière';
      const row = map.get(subject) ?? { lessons: 0, hwTotal: 0, hwDone: 0 };
      row.hwTotal += 1;
      if (hw.done) row.hwDone += 1;
      map.set(subject, row);
    }

    return Array.from(map.entries())
      .map(([subject, row]) => ({
        subject,
        lessons: row.lessons,
        homework: row.hwTotal,
        homeworkDoneRate: row.hwTotal ? Math.round((row.hwDone / row.hwTotal) * 100) : 0,
      }))
      .sort((a, b) => b.lessons - a.lessons);
  }, [homeworks, lessons]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes progressions</h1>
        <p className="text-sm text-gray-500 mt-1">Suivi par matière des cours réalisés et du travail associé</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : progress.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 text-center text-gray-500">
          Aucune progression calculable pour la période.
        </div>
      ) : (
        <div className="space-y-2">
          {progress.map((row) => (
            <article key={row.subject} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="font-semibold text-gray-900">{row.subject}</div>
                <div className="text-xs text-gray-600 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    <Clock3 className="w-3.5 h-3.5" /> {row.lessons} cours
                  </span>
                  <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                    <BookOpenCheck className="w-3.5 h-3.5" /> {row.homework} devoir(s)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Taux devoirs faits</span>
                <span className="font-semibold">{row.homeworkDoneRate}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: `${row.homeworkDoneRate}%` }} />
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 text-sm text-gray-600 inline-flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-blue-600" />
        La progression est estimée à partir des volumes de cours et devoirs sur 60 jours glissants.
      </div>
    </div>
  );
};

export default ProgressionsPage;
