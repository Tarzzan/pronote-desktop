import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { getClient } from '../lib/pronote/client';
import type { Grade, Period } from '../types/pronote';

type Level = 1 | 2 | 3 | 4;
type Row = { subject: string; level: Level; mean: number };

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

const levelLabel: Record<Level, string> = {
  1: 'Insuffisant',
  2: 'Fragile',
  3: 'Satisfaisant',
  4: 'Très bien',
};

const levelClass: Record<Level, string> = {
  1: 'bg-red-100 text-red-700 border-red-200',
  2: 'bg-amber-100 text-amber-700 border-amber-200',
  3: 'bg-blue-100 text-blue-700 border-blue-200',
  4: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const CompetencesEvaluationsPage: React.FC = () => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPeriods = async () => {
      const client = getClient();
      if (!client) {
        if (!cancelled) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await client.getPeriods();
        if (!cancelled) {
          setPeriods(data);
          setSelectedPeriod(data[0] ?? null);
        }
      } catch (error) {
        console.error('[CompetencesEvaluationsPage] Erreur périodes:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadPeriods();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadGrades = async () => {
      if (!selectedPeriod) {
        setGrades([]);
        return;
      }
      const client = getClient();
      if (!client) return;

      setLoading(true);
      try {
        const data = await client.getGrades(selectedPeriod);
        if (!cancelled) setGrades(data);
      } catch (error) {
        console.error('[CompetencesEvaluationsPage] Erreur notes:', error);
        if (!cancelled) setGrades([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadGrades();
    return () => {
      cancelled = true;
    };
  }, [selectedPeriod]);

  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, number[]>();
    for (const grade of grades) {
      const score = to20(grade);
      if (score === null) continue;
      const subject = grade.subject.name || 'Matière';
      const values = map.get(subject) ?? [];
      values.push(score);
      map.set(subject, values);
    }

    return Array.from(map.entries())
      .map(([subject, values]) => {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return { subject, mean: Math.round(mean * 10) / 10, level: meanToLevel(mean) };
      })
      .sort((a, b) => b.mean - a.mean);
  }, [grades]);

  useEffect(() => {
    if (!selectedPeriod) return;
    const key = `pronote_comp_eval_${selectedPeriod.id}`;
    const saved = localStorage.getItem(key);
    if (!saved) {
      const generated: Record<string, Level> = {};
      for (const row of rows) generated[row.subject] = row.level;
      setLevels(generated);
      return;
    }
    try {
      setLevels(JSON.parse(saved) as Record<string, Level>);
    } catch {
      // ignore
    }
  }, [rows, selectedPeriod]);

  const persist = () => {
    if (!selectedPeriod) return;
    localStorage.setItem(`pronote_comp_eval_${selectedPeriod.id}`, JSON.stringify(levels));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Évaluations de compétences</h1>
          <p className="text-sm text-gray-500 mt-1">Niveaux par matière, ajustables et enregistrés localement</p>
        </div>
        <button onClick={persist} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm hover:bg-blue-800">
          Sauvegarder
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {periods.map((period) => (
          <button
            key={period.id}
            onClick={() => setSelectedPeriod(period)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              selectedPeriod?.id === period.id
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {period.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 text-center text-gray-500">
          Aucune compétence évaluée sur cette période.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const currentLevel = levels[row.subject] ?? row.level;
            return (
              <article key={row.subject} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="font-semibold text-gray-900">{row.subject}</div>
                  <div className="text-xs text-gray-500">Moyenne observée: {row.mean}/20</div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {([1, 2, 3, 4] as Level[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setLevels((prev) => ({ ...prev, [row.subject]: level }))}
                      className={`px-2.5 py-1.5 text-xs rounded-lg border ${levelClass[level]} ${
                        currentLevel === level ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                      }`}
                    >
                      {currentLevel === level ? <CheckCircle2 className="w-3.5 h-3.5 inline-block mr-1" /> : null}
                      {levelLabel[level]}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CompetencesEvaluationsPage;
