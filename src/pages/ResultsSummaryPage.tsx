import React, { useEffect, useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { AlertTriangle, BookOpen, ChartNoAxesCombined, Clock3, GraduationCap } from 'lucide-react';
import { getClient } from '../lib/pronote/client';
import type { Grade, Homework, Period } from '../types/pronote';

function gradeTo20(grade: Grade): number | null {
  const g = parseFloat(String(grade.grade).replace(',', '.'));
  const out = parseFloat(String(grade.out_of).replace(',', '.'));
  if (Number.isNaN(g) || Number.isNaN(out) || out <= 0) return null;
  return (g / out) * 20;
}

const ResultsSummaryPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [period, setPeriod] = useState<Period | null>(null);

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
        const periods = await client.getPeriods();
        const selected = periods[0] ?? null;
        const [gradesData, homeworkData] = await Promise.all([
          selected ? client.getGrades(selected) : Promise.resolve([]),
          client.getHomework(addDays(new Date(), -21), addDays(new Date(), 21)),
        ]);

        if (!cancelled) {
          setPeriod(selected);
          setGrades(gradesData);
          setHomeworks(homeworkData);
        }
      } catch (error) {
        console.error('[ResultsSummaryPage] Erreur:', error);
        if (!cancelled) {
          setGrades([]);
          setHomeworks([]);
          setPeriod(null);
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

  const metrics = useMemo(() => {
    const gradeValues = grades.map(gradeTo20).filter((v): v is number => v !== null);
    const mean = gradeValues.length
      ? Math.round((gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length) * 10) / 10
      : 0;

    const done = homeworks.filter((h) => h.done).length;
    const todo = homeworks.length - done;
    const completion = homeworks.length ? Math.round((done / homeworks.length) * 100) : 0;

    const risk = mean < 10 || completion < 45;

    return {
      mean,
      done,
      todo,
      completion,
      risk,
      gradesCount: grades.length,
      homeworkCount: homeworks.length,
    };
  }, [grades, homeworks]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau récapitulatif</h1>
        <p className="text-sm text-gray-500 mt-1">
          Consolidation notes + travail à faire{period ? ` (${period.name})` : ''}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard title="Moyenne" value={`${metrics.mean}/20`} icon={<GraduationCap className="w-5 h-5 text-blue-700" />} />
            <StatCard title="Devoirs faits" value={String(metrics.done)} icon={<BookOpen className="w-5 h-5 text-emerald-700" />} />
            <StatCard title="À faire" value={String(metrics.todo)} icon={<Clock3 className="w-5 h-5 text-amber-700" />} />
            <StatCard title="Taux complétion" value={`${metrics.completion}%`} icon={<ChartNoAxesCombined className="w-5 h-5 text-indigo-700" />} />
          </div>

          <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-2">État global</h2>
            {metrics.risk ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Vigilance recommandée: renforcer le suivi des devoirs ou la consolidation des notes.
              </p>
            ) : (
              <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                <ChartNoAxesCombined className="w-4 h-4" />
                Dynamique satisfaisante: continuité du rythme de travail recommandée.
              </p>
            )}
            <div className="text-xs text-gray-500 mt-3">
              Base de calcul: {metrics.gradesCount} note(s), {metrics.homeworkCount} devoir(s).
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{title}</span>
      {icon}
    </div>
    <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
  </div>
);

export default ResultsSummaryPage;
