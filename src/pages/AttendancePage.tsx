import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getClient } from '../lib/pronote/client';
import type { Absence, Delay, Period } from '../types/pronote';

const AttendancePage: React.FC = () => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [delays, setDelays] = useState<Delay[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'absences' | 'delays'>('absences');

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
    const load = async () => {
      const client = getClient();
      if (!client) return;
      setLoading(true);
      try {
        const [a, d] = await Promise.all([
          client.getAbsences(selectedPeriod),
          client.getDelays(selectedPeriod),
        ]);
        setAbsences(a);
        setDelays(d);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedPeriod]);

  const justifiedAbsences = absences.filter((a) => a.justified).length;
  const unjustifiedAbsences = absences.filter((a) => !a.justified).length;
  const totalHours = absences.reduce((sum, a) => sum + parseFloat(a.hours || '0'), 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vie scolaire</h1>
          <p className="text-gray-500 text-sm mt-1">Absences et retards</p>
        </div>
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

      {/* Statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<AlertCircle className="w-5 h-5 text-red-500" />}
          label="Absences totales"
          value={absences.length}
          color="red"
        />
        <StatCard
          icon={<XCircle className="w-5 h-5 text-orange-500" />}
          label="Non justifiées"
          value={unjustifiedAbsences}
          color="orange"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          label="Justifiées"
          value={justifiedAbsences}
          color="green"
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-blue-500" />}
          label="Heures d'absence"
          value={totalHours}
          color="blue"
          suffix="h"
        />
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('absences')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'absences' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Absences ({absences.length})
        </button>
        <button
          onClick={() => setActiveTab('delays')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'delays' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Retards ({delays.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {activeTab === 'absences' ? (
            absences.length === 0 ? (
              <EmptyState message="Aucune absence pour cette période" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-5 py-3 font-medium">Du</th>
                      <th className="text-left px-4 py-3 font-medium">Au</th>
                      <th className="text-center px-4 py-3 font-medium">Durée</th>
                      <th className="text-center px-4 py-3 font-medium">Justifiée</th>
                      <th className="text-left px-4 py-3 font-medium">Motif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absences.map((a) => (
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                          {format(a.from_date, 'EEEE d MMM yyyy', { locale: fr })}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {format(a.to_date, 'EEEE d MMM yyyy', { locale: fr })}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">
                          {a.hours}h ({a.days} j)
                        </td>
                        <td className="px-4 py-3 text-center">
                          {a.justified ? (
                            <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                              <CheckCircle className="w-3 h-3" /> Oui
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium">
                              <XCircle className="w-3 h-3" /> Non
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {a.reasons.join(', ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            delays.length === 0 ? (
              <EmptyState message="Aucun retard pour cette période" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-5 py-3 font-medium">Date</th>
                      <th className="text-center px-4 py-3 font-medium">Durée</th>
                      <th className="text-center px-4 py-3 font-medium">Justifié</th>
                      <th className="text-left px-4 py-3 font-medium">Justification</th>
                      <th className="text-left px-4 py-3 font-medium">Motif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {delays.map((d) => (
                      <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                          {format(d.date, 'EEEE d MMM yyyy', { locale: fr })}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">
                          {d.minutes} min
                        </td>
                        <td className="px-4 py-3 text-center">
                          {d.justified ? (
                            <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                              <CheckCircle className="w-3 h-3" /> Oui
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium">
                              <XCircle className="w-3 h-3" /> Non
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{d.justification || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{d.reasons.join(', ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode; label: string; value: number; color: string; suffix?: string;
}> = ({ icon, label, value, color, suffix = '' }) => {
  const colors: Record<string, string> = {
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
  };
  return (
    <div className={`${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-2xl font-bold text-gray-900">{value}{suffix}</span>
      </div>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-16 text-gray-400">
    <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
    <p>{message}</p>
  </div>
);

export default AttendancePage;
