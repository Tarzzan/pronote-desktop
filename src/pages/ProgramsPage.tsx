import React, { useEffect, useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { BookOpenText } from 'lucide-react';
import { getClient } from '../lib/pronote/client';
import type { Homework, Lesson } from '../types/pronote';

type ProgramRow = {
  subject: string;
  lessonCount: number;
  homeworkCount: number;
  axis: string;
};

function inferAxis(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes('math')) return 'Résolution de problèmes, raisonnement, modélisation.';
  if (s.includes('fran')) return 'Lecture analytique, expression écrite, oral argumenté.';
  if (s.includes('histoire') || s.includes('geo')) return 'Repères chronologiques, analyse documentaire, argumentation.';
  if (s.includes('anglais') || s.includes('allemand') || s.includes('espagnol')) return 'Compréhension, interaction et production en langue vivante.';
  if (s.includes('physique') || s.includes('svt') || s.includes('chimie')) return 'Démarche expérimentale, modélisation scientifique, esprit critique.';
  return 'Consolidation des fondamentaux et progression spiralaire des compétences.';
}

const ProgramsPage: React.FC = () => {
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
        console.error('[ProgramsPage] Erreur:', error);
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

  const rows = useMemo<ProgramRow[]>(() => {
    const map = new Map<string, { lessons: number; homework: number }>();

    for (const lesson of lessons) {
      const subject = lesson.subject?.name || 'Matière';
      const row = map.get(subject) ?? { lessons: 0, homework: 0 };
      row.lessons += 1;
      map.set(subject, row);
    }

    for (const hw of homeworks) {
      const subject = hw.subject.name || 'Matière';
      const row = map.get(subject) ?? { lessons: 0, homework: 0 };
      row.homework += 1;
      map.set(subject, row);
    }

    return Array.from(map.entries())
      .map(([subject, row]) => ({
        subject,
        lessonCount: row.lessons,
        homeworkCount: row.homework,
        axis: inferAxis(subject),
      }))
      .sort((a, b) => b.lessonCount - a.lessonCount || a.subject.localeCompare(b.subject, 'fr'));
  }, [homeworks, lessons]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Programmes officiels</h1>
        <p className="text-sm text-gray-500 mt-1">Vue opérationnelle des axes programmatiques par matière</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 text-center text-gray-500">
          Aucun programme exploitable trouvé.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <article key={row.subject} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="font-semibold text-gray-900">{row.subject}</div>
                <div className="text-xs text-gray-600">
                  {row.lessonCount} cours • {row.homeworkCount} devoir(s)
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-700">{row.axis}</p>
            </article>
          ))}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 text-sm text-gray-600 inline-flex items-center gap-2">
        <BookOpenText className="w-4 h-4 text-blue-600" />
        Cette page propose un cadrage pédagogique synthétique basé sur l&apos;activité réelle observée.
      </div>
    </div>
  );
};

export default ProgramsPage;
