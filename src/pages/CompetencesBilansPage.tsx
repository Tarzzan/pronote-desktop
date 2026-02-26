import React, { useEffect, useMemo, useState } from 'react';
import { PieChart } from 'lucide-react';
import { getClient } from '../lib/pronote/client';
import type { Grade, Period } from '../types/pronote';

type Level = 1 | 2 | 3 | 4;

function to20(grade: Grade): number | null {
  const g = parseFloat(String(grade.grade).replace(',', '.'));
  const out = parseFloat(String(grade.out_of).replace(',', '.'));
  if (Number.isNaN(g) || Number.isNaN(out) || out <= 0) return null;
  return (g / out) * 20;
}

function meanToLevel(mean: number): Level {
  if (mean >= 16) return 4;
  if (mean >= 12) return 3;
  if (mean >= 10) return 2;
  return 1;
}

const labelMap: Record<Level, string> = {
  1: 'Insuffisant',
  2: 'Fragile',
  3: 'Satisfaisant',
  4: 'Très bien',
};

const colorMap: Record<Level, string> = {
  1: 'bg-red-100 text-red-700 border-red-200',
  2: 'bg-amber-100 text-amber-700 border-amber-200',
  3: 'bg-blue-100 text-blue-700 border-blue-200',
  4: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const CompetencesBilansPage: React.FC = () => {
  const [period, setPeriod] = useState<Period | null>(null);
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [loading, setLoading] = useState(true);

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
        if (!selected) {
          if (!cancelled) {
            setLevels({});
            setPeriod(null);
          }
          return;
        }

        const key = `pronote_comp_eval_${selected.id}`;
        const stored = localStorage.getItem(key);

        if (stored) {
          if (!cancelled) {
            setPeriod(selected);
            setLevels(JSON.parse(stored) as Record<string, Level>);
          }
          return;
        }

        const grades = await client.getGrades(selected);
        const map = new Map<string, number[]>();
        for (const grade of grades) {
          const score = to20(grade);
          if (score === null) continue;
          const subject = grade.subject.name || 'Matière';
          const values = map.get(subject) ?? [];
          values.push(score);
          map.set(subject, values);
        }

        const generated: Record<string, Level> = {};
        for (const [subject, values] of map.entries()) {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          generated[subject] = meanToLevel(mean);
        }

        if (!cancelled) {
          setPeriod(selected);
          setLevels(generated);
        }
      } catch (error) {
        console.error('[CompetencesBilansPage] Erreur:', error);
        if (!cancelled) {
          setLevels({});
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

  const summary = useMemo(() => {
    const counts: Record<Level, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const level of Object.values(levels)) {
      counts[level] += 1;
    }
    return counts;
  }, [levels]);

  const total = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bilans de cycle</h1>
        <p className="text-sm text-gray-500 mt-1">
          Synthèse des niveaux de compétence{period ? ` • ${period.name}` : ''}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : total === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 text-center text-gray-500">
          Aucun bilan disponible.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {([1, 2, 3, 4] as Level[]).map((level) => (
              <div key={level} className={`border rounded-xl p-4 ${colorMap[level]}`}>
                <div className="text-xs font-medium">{labelMap[level]}</div>
                <div className="text-2xl font-bold mt-1">{summary[level]}</div>
              </div>
            ))}
          </div>

          <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-3 inline-flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              Répartition par matière
            </h2>
            <div className="space-y-2">
              {Object.entries(levels)
                .sort((a, b) => a[0].localeCompare(b[0], 'fr'))
                .map(([subject, level]) => (
                  <div key={subject} className="flex items-center justify-between gap-2 text-sm border-b border-gray-50 pb-2">
                    <span className="text-gray-800">{subject}</span>
                    <span className={`text-xs px-2 py-1 rounded-full border ${colorMap[level]}`}>{labelMap[level]}</span>
                  </div>
                ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default CompetencesBilansPage;
