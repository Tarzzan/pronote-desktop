import React, { useEffect, useMemo, useState } from 'react';
import { BookMarked } from 'lucide-react';
import { getClient } from '../lib/pronote/client';
import type { Average, Period } from '../types/pronote';

type SubjectRow = {
  subject: string;
  values: Record<string, string>;
};

const ResultsLivretPage: React.FC = () => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [averagesByPeriod, setAveragesByPeriod] = useState<Record<string, Average[]>>({});
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
        const p = await client.getPeriods();
        const map: Record<string, Average[]> = {};
        for (const period of p) {
          map[period.id] = await client.getAverages(period);
        }
        if (!cancelled) {
          setPeriods(p);
          setAveragesByPeriod(map);
        }
      } catch (error) {
        console.error('[ResultsLivretPage] Erreur:', error);
        if (!cancelled) {
          setPeriods([]);
          setAveragesByPeriod({});
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

  const tableRows = useMemo<SubjectRow[]>(() => {
    const map = new Map<string, SubjectRow>();
    for (const period of periods) {
      const averages = averagesByPeriod[period.id] || [];
      for (const avg of averages) {
        const subject = avg.subject.name || 'Matière';
        const existing = map.get(subject) ?? { subject, values: {} };
        existing.values[period.id] = avg.student || '—';
        map.set(subject, existing);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.subject.localeCompare(b.subject, 'fr'));
  }, [averagesByPeriod, periods]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Livret scolaire</h1>
        <p className="text-sm text-gray-500 mt-1">Suivi des moyennes par matière et par période</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tableRows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 text-center text-gray-500">
          <BookMarked className="w-10 h-10 mx-auto mb-3 opacity-40" />
          Aucune moyenne disponible pour alimenter le livret.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                <th className="text-left px-4 py-3 font-medium">Matière</th>
                {periods.map((period) => (
                  <th key={period.id} className="text-left px-4 py-3 font-medium whitespace-nowrap">
                    {period.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.subject} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{row.subject}</td>
                  {periods.map((period) => (
                    <td key={period.id} className="px-4 py-3 text-gray-700">
                      {row.values[period.id] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ResultsLivretPage;
