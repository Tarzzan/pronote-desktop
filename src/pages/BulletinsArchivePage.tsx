import React, { useEffect, useMemo, useState } from 'react';
import { Archive, ChevronDown, ChevronUp } from 'lucide-react';
import { getClient } from '../lib/pronote/client';
import type { Grade, Period } from '../types/pronote';

type ArchiveEntry = {
  key: string;
  period: Period;
  grades: Grade[];
  mean: number;
  bestSubject: string;
  worstSubject: string;
  snapshotSignature: string;
};

function parseScore(value: string): number | null {
  const numeric = parseFloat(value.replace(',', '.'));
  return Number.isNaN(numeric) ? null : numeric;
}

function computeMean(grades: Grade[]): number {
  const values: number[] = [];
  for (const grade of grades) {
    const g = parseScore(String(grade.grade));
    const outOf = parseScore(String(grade.out_of));
    if (g === null || outOf === null || outOf <= 0) continue;
    values.push((g / outOf) * 20);
  }
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function getSubjectMeans(grades: Grade[]): Map<string, number> {
  const map = new Map<string, number[]>();
  for (const grade of grades) {
    const g = parseScore(String(grade.grade));
    const outOf = parseScore(String(grade.out_of));
    if (g === null || outOf === null || outOf <= 0) continue;
    const subject = grade.subject.name || 'Matière';
    const values = map.get(subject) ?? [];
    values.push((g / outOf) * 20);
    map.set(subject, values);
  }

  const means = new Map<string, number>();
  for (const [subject, values] of map.entries()) {
    means.set(subject, values.reduce((a, b) => a + b, 0) / values.length);
  }
  return means;
}

function buildPeriodEntryKey(period: Period, index: number): string {
  const start = period.start instanceof Date && !Number.isNaN(period.start.getTime())
    ? period.start.toISOString()
    : '';
  const end = period.end instanceof Date && !Number.isNaN(period.end.getTime())
    ? period.end.toISOString()
    : '';
  return `${period.id}|${period.name}|${start}|${end}|${index}`;
}

function buildGradesSnapshotSignature(grades: Grade[]): string {
  return grades
    .map((grade) => [
      grade.id,
      grade.subject.name,
      grade.grade,
      grade.out_of,
      grade.coefficient,
      grade.comment || '',
      grade.date instanceof Date && !Number.isNaN(grade.date.getTime()) ? grade.date.toISOString() : '',
    ].join('|'))
    .sort()
    .join('||');
}

const BulletinsArchivePage: React.FC = () => {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState<string | null>(null);

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
        const archive = await Promise.all(
          periods.map(async (period, index) => {
            const grades = await client.getGrades(period);
            const mean = computeMean(grades);
            const subjectMeans = getSubjectMeans(grades);
            const sorted = Array.from(subjectMeans.entries()).sort((a, b) => b[1] - a[1]);
            return {
              key: buildPeriodEntryKey(period, index),
              period,
              grades,
              mean,
              bestSubject: sorted[0]?.[0] ?? '—',
              worstSubject: sorted[sorted.length - 1]?.[0] ?? '—',
              snapshotSignature: buildGradesSnapshotSignature(grades),
            };
          })
        );

        if (!cancelled) {
          setEntries(archive);
          setOpened(archive[0]?.key ?? null);
        }
      } catch (error) {
        console.error('[BulletinsArchivePage] Erreur:', error);
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const globalMean = useMemo(() => {
    if (entries.length === 0) return 0;
    const valid = entries.filter((e) => e.mean > 0).map((e) => e.mean);
    if (valid.length === 0) return 0;
    return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
  }, [entries]);

  const allPeriodsShareSameSnapshot = useMemo(() => {
    if (entries.length <= 1) return false;
    const signatures = new Set(entries.map((entry) => entry.snapshotSignature));
    return signatures.size === 1;
  }, [entries]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Anciens bulletins</h1>
        <p className="text-sm text-gray-500 mt-1">Historique des périodes avec indicateurs de performance</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 text-sm text-gray-700 inline-flex items-center gap-2">
        <Archive className="w-4 h-4 text-blue-600" />
        Moyenne historique globale: <span className="font-semibold text-gray-900">{globalMean}/20</span>
      </div>

      {allPeriodsShareSameSnapshot && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Les périodes affichent actuellement les mêmes données sur ce compte. Cela peut venir des données de démonstration si aucune distinction n'est fournie côté source.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 text-center text-gray-500">
          Aucun bulletin archivable disponible.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isOpen = opened === entry.key;
            return (
              <section key={entry.key} className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <button
                  onClick={() => setOpened((prev) => (prev === entry.key ? null : entry.key))}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div>
                    <div className="font-semibold text-gray-900">{entry.period.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Moyenne {entry.mean}/20 • meilleure matière: {entry.bestSubject} • plus fragile: {entry.worstSubject}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    {entry.grades.length === 0 ? (
                      <p className="text-sm text-gray-500">Aucune note sur cette période.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-500 border-b border-gray-200">
                              <th className="text-left py-2 pr-3 font-medium">Matière</th>
                              <th className="text-left py-2 pr-3 font-medium">Note</th>
                              <th className="text-left py-2 pr-3 font-medium">Coef</th>
                              <th className="text-left py-2 pr-3 font-medium">Commentaire</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.grades.map((grade) => (
                              <tr key={grade.id} className="border-b border-gray-50">
                                <td className="py-2 pr-3 text-gray-800">{grade.subject.name}</td>
                                <td className="py-2 pr-3 text-gray-700">{grade.grade}/{grade.out_of}</td>
                                <td className="py-2 pr-3 text-gray-700">{grade.coefficient}</td>
                                <td className="py-2 pr-3 text-gray-500">{grade.comment || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BulletinsArchivePage;
