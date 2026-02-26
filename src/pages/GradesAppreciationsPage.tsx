import React, { useEffect, useMemo, useState } from 'react';
import { FilePenLine, Sparkles } from 'lucide-react';
import { getClient } from '../lib/pronote/client';
import type { Grade, Period } from '../types/pronote';

type SubjectStats = {
  subject: string;
  mean: number;
  count: number;
};

function computeScore(grade: Grade): number | null {
  const g = parseFloat(String(grade.grade).replace(',', '.'));
  const out = parseFloat(String(grade.out_of).replace(',', '.'));
  if (Number.isNaN(g) || Number.isNaN(out) || out <= 0) return null;
  return (g / out) * 20;
}

function suggestion(mean: number): string {
  if (mean >= 16) return 'Excellent travail, très grande maîtrise et implication constante.';
  if (mean >= 14) return 'Très bons résultats, travail sérieux et régulier.';
  if (mean >= 12) return 'Ensemble satisfaisant, des efforts réguliers portent leurs fruits.';
  if (mean >= 10) return 'Résultats corrects, poursuivre la consolidation des acquis.';
  return 'Résultats fragiles, un accompagnement plus régulier est recommandé.';
}

const GradesAppreciationsPage: React.FC = () => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
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
        console.error('[GradesAppreciationsPage] Erreur périodes:', error);
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
        console.error('[GradesAppreciationsPage] Erreur notes:', error);
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

  const bySubject = useMemo<SubjectStats[]>(() => {
    const map = new Map<string, number[]>();
    for (const grade of grades) {
      const score = computeScore(grade);
      if (score === null) continue;
      const subject = grade.subject.name || 'Matière';
      const values = map.get(subject) ?? [];
      values.push(score);
      map.set(subject, values);
    }

    return Array.from(map.entries())
      .map(([subject, values]) => ({
        subject,
        count: values.length,
        mean: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
      }))
      .sort((a, b) => b.mean - a.mean);
  }, [grades]);

  useEffect(() => {
    if (!selectedPeriod) return;
    const key = `pronote_appreciations_${selectedPeriod.id}`;
    const stored = localStorage.getItem(key);
    if (!stored) {
      const generated: Record<string, string> = {};
      for (const row of bySubject) {
        generated[row.subject] = suggestion(row.mean);
      }
      setNotes(generated);
      return;
    }
    try {
      setNotes(JSON.parse(stored) as Record<string, string>);
    } catch {
      // ignore invalid local storage
    }
  }, [bySubject, selectedPeriod]);

  const persist = () => {
    if (!selectedPeriod) return;
    localStorage.setItem(`pronote_appreciations_${selectedPeriod.id}`, JSON.stringify(notes));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appréciations des notes</h1>
          <p className="text-sm text-gray-500 mt-1">Synthèse par matière avec proposition éditable</p>
        </div>
        <button
          onClick={persist}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm hover:bg-blue-800"
        >
          <FilePenLine className="w-4 h-4" />
          Enregistrer localement
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {periods.map((period) => (
          <button
            key={period.id}
            onClick={() => setSelectedPeriod(period)}
            className={`px-3 py-1.5 text-sm rounded-lg border ${
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
      ) : bySubject.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 text-center text-gray-500">
          Aucune donnée exploitable pour générer des appréciations.
        </div>
      ) : (
        <div className="space-y-3">
          {bySubject.map((row) => (
            <article key={row.subject} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="font-semibold text-gray-900">{row.subject}</div>
                <div className="text-xs text-gray-600 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Moy. {row.mean}/20</span>
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{row.count} note(s)</span>
                </div>
              </div>
              <label className="text-xs text-gray-500 inline-flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Appréciation proposée
              </label>
              <textarea
                value={notes[row.subject] ?? suggestion(row.mean)}
                onChange={(e) => setNotes((prev) => ({ ...prev, [row.subject]: e.target.value }))}
                rows={3}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default GradesAppreciationsPage;
