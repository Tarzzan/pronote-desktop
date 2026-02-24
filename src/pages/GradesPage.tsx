import React, { useEffect, useState } from 'react';
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getClient } from '../lib/pronote/client';
import type { Grade, Average, Period } from '../types/pronote';

const GradesPage: React.FC = () => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [averages, setAverages] = useState<Average[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'grades' | 'averages'>('grades');

  useEffect(() => {
    const loadPeriods = async () => {
      const client = getClient();
      if (!client) return;
      const p = await client.getPeriods();
      setPeriods(p);
      if (p.length > 0) setSelectedPeriod(p[0]);
    };
    loadPeriods();
  }, []);

  useEffect(() => {
    if (!selectedPeriod) return;
    const loadGrades = async () => {
      const client = getClient();
      if (!client) return;
      setLoading(true);
      try {
        const [g, a] = await Promise.all([
          client.getGrades(selectedPeriod),
          client.getAverages(selectedPeriod),
        ]);
        setGrades(g);
        setAverages(a);
      } finally {
        setLoading(false);
      }
    };
    loadGrades();
  }, [selectedPeriod]);

  const gradesBySubject = grades.reduce<Record<string, Grade[]>>((acc, g) => {
    const key = g.subject.name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});

  const parseGrade = (g: string): number | null => {
    const n = parseFloat(g.replace(',', '.'));
    return isNaN(n) ? null : n;
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
          <p className="text-gray-500 text-sm mt-1">Relevé de notes par période</p>
        </div>
        {/* Sélecteur de période */}
        <div className="flex gap-2 flex-wrap">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod?.id === p.id
                  ? 'bg-blue-700 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('grades')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'grades' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Star className="w-4 h-4 inline mr-1.5" />
          Notes ({grades.length})
        </button>
        <button
          onClick={() => setActiveTab('averages')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'averages' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-1.5" />
          Moyennes ({averages.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'grades' && (
            <div className="space-y-4">
              {grades.length === 0 ? (
                <EmptyState message="Aucune note pour cette période" />
              ) : (
                Object.entries(gradesBySubject).map(([subject, subjectGrades]) => (
                  <div key={subject} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">{subject}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500 border-b border-gray-100">
                            <th className="text-left px-4 py-2 font-medium">Date</th>
                            <th className="text-left px-4 py-2 font-medium">Commentaire</th>
                            <th className="text-center px-4 py-2 font-medium">Note</th>
                            <th className="text-center px-4 py-2 font-medium">Coeff.</th>
                            <th className="text-center px-4 py-2 font-medium">Moy. classe</th>
                            <th className="text-center px-4 py-2 font-medium">Max</th>
                            <th className="text-center px-4 py-2 font-medium">Min</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectGrades.map((grade) => {
                            const gradeVal = parseGrade(grade.grade);
                            const outOf = parseGrade(grade.out_of) || 20;
                            const percent = gradeVal !== null ? (gradeVal / outOf) * 100 : null;
                            const gradeColor = percent === null ? 'text-gray-500'
                              : percent >= 70 ? 'text-green-600'
                              : percent >= 50 ? 'text-orange-500'
                              : 'text-red-600';

                            return (
                              <tr key={grade.id} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                  {format(grade.date, 'd MMM yyyy', { locale: fr })}
                                </td>
                                <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                                  {grade.comment || '—'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`font-bold text-base ${gradeColor}`}>
                                    {grade.grade}
                                  </span>
                                  <span className="text-gray-400 text-xs">/{grade.out_of}</span>
                                  {grade.is_bonus && (
                                    <span className="ml-1 text-xs text-blue-500 font-medium">Bonus</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-600">{grade.coefficient}</td>
                                <td className="px-4 py-3 text-center text-gray-600">{grade.average || '—'}</td>
                                <td className="px-4 py-3 text-center text-green-600">{grade.max || '—'}</td>
                                <td className="px-4 py-3 text-center text-red-500">{grade.min || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'averages' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {averages.length === 0 ? (
                <EmptyState message="Aucune moyenne pour cette période" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                        <th className="text-left px-5 py-3 font-medium">Matière</th>
                        <th className="text-center px-4 py-3 font-medium">Moy. élève</th>
                        <th className="text-center px-4 py-3 font-medium">Moy. classe</th>
                        <th className="text-center px-4 py-3 font-medium">Max</th>
                        <th className="text-center px-4 py-3 font-medium">Min</th>
                        <th className="text-left px-4 py-3 font-medium">Tendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {averages.map((avg, i) => {
                        const student = parseFloat(avg.student.replace(',', '.'));
                        const classAvg = parseFloat(avg.class_average.replace(',', '.'));
                        const diff = student - classAvg;

                        return (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: avg.background_color }}
                                />
                                <span className="font-medium text-gray-900">{avg.subject.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-bold ${
                                student >= 10 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {avg.student}
                              </span>
                              <span className="text-gray-400 text-xs">/{avg.out_of}</span>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600">{avg.class_average}</td>
                            <td className="px-4 py-3 text-center text-green-600">{avg.max}</td>
                            <td className="px-4 py-3 text-center text-red-500">{avg.min}</td>
                            <td className="px-4 py-3">
                              {!isNaN(diff) && (
                                <div className={`flex items-center gap-1 text-xs font-medium ${
                                  diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-gray-500'
                                }`}>
                                  {diff > 0 ? <TrendingUp className="w-4 h-4" /> :
                                   diff < 0 ? <TrendingDown className="w-4 h-4" /> :
                                   <Minus className="w-4 h-4" />}
                                  {diff > 0 ? '+' : ''}{diff.toFixed(2)} vs classe
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-16 text-gray-400">
    <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
    <p>{message}</p>
  </div>
);

export default GradesPage;
