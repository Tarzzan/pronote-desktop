import React, { useEffect, useMemo, useState } from 'react';
import { Save, RotateCcw, PencilLine } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getClient } from '../lib/pronote/client';
import type { Grade, Period } from '../types/pronote';

type DraftGrade = {
  grade: string;
  outOf: string;
  coefficient: string;
  comment: string;
};

const GradesEditPage: React.FC = () => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftGrade>>({});
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

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
        console.error('[GradesEditPage] Erreur chargement périodes:', error);
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
        setDrafts({});
        return;
      }

      const client = getClient();
      if (!client) return;

      setLoading(true);
      try {
        const data = await client.getGrades(selectedPeriod);
        if (cancelled) return;
        setGrades(data);
        const initialDrafts: Record<string, DraftGrade> = {};
        for (const grade of data) {
          initialDrafts[grade.id] = {
            grade: String(grade.grade || ''),
            outOf: String(grade.out_of || '20'),
            coefficient: String(grade.coefficient || '1'),
            comment: String(grade.comment || ''),
          };
        }
        setDrafts(initialDrafts);
      } catch (error) {
        console.error('[GradesEditPage] Erreur chargement notes:', error);
        if (!cancelled) {
          setGrades([]);
          setDrafts({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadGrades();
    return () => {
      cancelled = true;
    };
  }, [selectedPeriod]);

  const dirtyCount = useMemo(() => {
    let dirty = 0;
    for (const grade of grades) {
      const draft = drafts[grade.id];
      if (!draft) continue;
      if (
        draft.grade !== String(grade.grade || '') ||
        draft.outOf !== String(grade.out_of || '20') ||
        draft.coefficient !== String(grade.coefficient || '1') ||
        draft.comment !== String(grade.comment || '')
      ) {
        dirty += 1;
      }
    }
    return dirty;
  }, [drafts, grades]);

  const handleDraftChange = (id: string, key: keyof DraftGrade, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { grade: '', outOf: '20', coefficient: '1', comment: '' }),
        [key]: value,
      },
    }));
  };

  const resetDrafts = () => {
    const initialDrafts: Record<string, DraftGrade> = {};
    for (const grade of grades) {
      initialDrafts[grade.id] = {
        grade: String(grade.grade || ''),
        outOf: String(grade.out_of || '20'),
        coefficient: String(grade.coefficient || '1'),
        comment: String(grade.comment || ''),
      };
    }
    setDrafts(initialDrafts);
  };

  const persistLocally = () => {
    if (!selectedPeriod) return;
    const key = `pronote_grades_drafts_${selectedPeriod.id}`;
    localStorage.setItem(key, JSON.stringify(drafts));
    setSavedAt(new Date());
  };

  useEffect(() => {
    if (!selectedPeriod) return;
    const key = `pronote_grades_drafts_${selectedPeriod.id}`;
    const stored = localStorage.getItem(key);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Record<string, DraftGrade>;
      setDrafts((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore corrupted local drafts
    }
  }, [selectedPeriod]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saisie des notes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Atelier de préparation locale (pas d&apos;écriture API Pronote pour cette section)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetDrafts}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </button>
          <button
            onClick={persistLocally}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-700 text-white hover:bg-blue-800"
          >
            <Save className="w-4 h-4" />
            Sauvegarder localement
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
        <div className="flex gap-2 flex-wrap">
          {periods.map((period) => (
            <button
              key={period.id}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1.5 rounded-lg border ${
                selectedPeriod?.id === period.id
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {period.name}
            </button>
          ))}
        </div>
        <div className="text-gray-500 sm:ml-auto">
          {dirtyCount} ligne(s) modifiée(s)
          {savedAt ? ` • dernier enregistrement local ${format(savedAt, 'HH:mm:ss', { locale: fr })}` : ''}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : grades.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 text-center text-gray-500">
          <PencilLine className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Aucune note disponible sur cette période.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Matière</th>
                  <th className="text-left px-4 py-3 font-medium">Note</th>
                  <th className="text-left px-4 py-3 font-medium">/</th>
                  <th className="text-left px-4 py-3 font-medium">Coef</th>
                  <th className="text-left px-4 py-3 font-medium">Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((grade) => {
                  const draft = drafts[grade.id];
                  return (
                    <tr key={grade.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600 whitespace-nowrap">
                        {format(grade.date, 'EEE d MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-4 py-2 font-semibold text-gray-800 whitespace-nowrap">
                        {grade.subject.name}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={draft?.grade ?? ''}
                          onChange={(e) => handleDraftChange(grade.id, 'grade', e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-200 rounded-md"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={draft?.outOf ?? '20'}
                          onChange={(e) => handleDraftChange(grade.id, 'outOf', e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-200 rounded-md"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={draft?.coefficient ?? '1'}
                          onChange={(e) => handleDraftChange(grade.id, 'coefficient', e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-200 rounded-md"
                        />
                      </td>
                      <td className="px-4 py-2 min-w-[260px]">
                        <input
                          value={draft?.comment ?? ''}
                          onChange={(e) => handleDraftChange(grade.id, 'comment', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded-md"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradesEditPage;
