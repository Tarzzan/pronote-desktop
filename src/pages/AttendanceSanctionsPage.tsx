import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getClient } from '../lib/pronote/client';
import type { Absence, Delay, Period } from '../types/pronote';

type EventEntry = {
  id: string;
  date: Date;
  type: 'absence' | 'retard';
  justified: boolean;
  detail: string;
  severity: 'low' | 'medium' | 'high';
};

function severityOfAbsence(a: Absence): 'low' | 'medium' | 'high' {
  const hours = parseFloat(a.hours || '0');
  if (a.justified) return 'low';
  if (hours >= 4 || a.days >= 1) return 'high';
  if (hours >= 2) return 'medium';
  return 'low';
}

function severityOfDelay(d: Delay): 'low' | 'medium' | 'high' {
  if (d.justified) return 'low';
  if (d.minutes >= 20) return 'high';
  if (d.minutes >= 10) return 'medium';
  return 'low';
}

const AttendanceSanctionsPage: React.FC = () => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [handled, setHandled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const raw = localStorage.getItem('pronote_sanctions_handled');
    if (!raw) return;
    try {
      setHandled(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      // ignore invalid storage
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pronote_sanctions_handled', JSON.stringify(handled));
  }, [handled]);

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
        console.error('[AttendanceSanctionsPage] Erreur périodes:', error);
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

    const loadEvents = async () => {
      if (!selectedPeriod) {
        setEvents([]);
        return;
      }
      const client = getClient();
      if (!client) return;

      setLoading(true);
      try {
        const [absences, delays] = await Promise.all([
          client.getAbsences(selectedPeriod),
          client.getDelays(selectedPeriod),
        ]);

        const all: EventEntry[] = [
          ...absences.map((a) => ({
            id: `abs-${a.id}`,
            date: a.from_date,
            type: 'absence' as const,
            justified: a.justified,
            detail: `${a.hours}h (${a.days}j) • ${a.reasons.join(', ') || 'Motif non précisé'}`,
            severity: severityOfAbsence(a),
          })),
          ...delays.map((d) => ({
            id: `ret-${d.id}`,
            date: d.date,
            type: 'retard' as const,
            justified: d.justified,
            detail: `${d.minutes} min • ${d.reasons.join(', ') || d.justification || 'Motif non précisé'}`,
            severity: severityOfDelay(d),
          })),
        ].sort((a, b) => b.date.getTime() - a.date.getTime());

        if (!cancelled) setEvents(all);
      } catch (error) {
        console.error('[AttendanceSanctionsPage] Erreur événements:', error);
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, [selectedPeriod]);

  const pending = useMemo(() => events.filter((e) => !e.justified && !handled[e.id]), [events, handled]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Punitions et sanctions</h1>
        <p className="text-sm text-gray-500 mt-1">Pré-tri automatique des événements à traiter</p>
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

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 text-sm">
        <div className="font-semibold text-gray-900 mb-1 inline-flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          Dossiers à traiter
        </div>
        <div className="text-gray-600">{pending.length} événement(s) non justifié(s) non classé(s).</div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 text-center text-gray-500">
          Aucun événement disciplinaire détecté sur la période.
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const isHandled = handled[event.id] ?? false;
            const color =
              event.severity === 'high'
                ? 'border-red-200 bg-red-50'
                : event.severity === 'medium'
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-gray-200 bg-gray-50';

            return (
              <article key={event.id} className={`border rounded-xl p-3 ${color}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-gray-900 capitalize">
                      {event.type} • {format(event.date, 'EEE d MMM yyyy', { locale: fr })}
                    </div>
                    <div className="text-sm text-gray-700 mt-1">{event.detail}</div>
                    <div className="text-xs mt-1 text-gray-500">
                      {event.justified ? 'Justifié' : 'Non justifié'} • niveau {event.severity}
                    </div>
                  </div>

                  <button
                    onClick={() => setHandled((prev) => ({ ...prev, [event.id]: !prev[event.id] }))}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${
                      isHandled
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                  >
                    {isHandled ? 'Classé' : 'Marquer traité'}
                  </button>
                </div>
                {event.severity === 'high' && !event.justified && !isHandled && (
                  <p className="text-xs text-red-700 mt-2 inline-flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Priorité élevée recommandée.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttendanceSanctionsPage;
