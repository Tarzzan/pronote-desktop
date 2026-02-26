import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, FileSearch, Filter } from 'lucide-react';
import { addDays, format, isPast, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getClient } from '../lib/pronote/client';
import type { Homework } from '../types/pronote';

const AROUND_DAYS_PAST = 14;
const AROUND_DAYS_FUTURE = 60;

const EXAM_KEYWORDS = [
  'controle',
  'contrôle',
  'evaluation',
  'évaluation',
  'interro',
  'devoir surveille',
  'devoir surveillé',
  'ds',
  'qcm',
  'test',
  'exam',
  'examen',
];

const examRegex = new RegExp(`\\b(${EXAM_KEYWORDS.join('|')})\\b`, 'i');

const HomeworkExamsPage: React.FC = () => {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const client = getClient();
      if (!client) {
        if (!cancelled) {
          setHomeworks([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const now = new Date();
        const data = await client.getHomework(addDays(now, -AROUND_DAYS_PAST), addDays(now, AROUND_DAYS_FUTURE));
        if (!cancelled) setHomeworks(data);
      } catch (error) {
        console.error('[HomeworkExamsPage] Erreur:', error);
        if (!cancelled) setHomeworks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const examItems = useMemo(() => {
    return homeworks
      .filter((hw) => examRegex.test(hw.description))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [homeworks]);

  const upcoming = useMemo(
    () => examItems.filter((hw) => !isPast(hw.date) || isToday(hw.date)),
    [examItems]
  );
  const previous = useMemo(
    () => examItems.filter((hw) => isPast(hw.date) && !isToday(hw.date)),
    [examItems]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrôles et examens</h1>
          <p className="text-sm text-gray-500 mt-1">
            Détection automatique dans le cahier de textes ({AROUND_DAYS_PAST} jours passés / {AROUND_DAYS_FUTURE} jours à venir)
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard title="Détectés" value={examItems.length} icon={<Filter className="w-5 h-5 text-blue-600" />} />
            <StatCard title="À venir" value={upcoming.length} icon={<CalendarClock className="w-5 h-5 text-emerald-600" />} />
            <StatCard title="Passés" value={previous.length} icon={<CheckCircle2 className="w-5 h-5 text-gray-500" />} />
          </div>

          {examItems.length === 0 ? (
            <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
              <FileSearch className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-700 font-medium">Aucun contrôle détecté sur la période.</p>
              <p className="text-sm text-gray-500 mt-1">
                La détection se base sur des mots-clés dans la description (contrôle, évaluation, DS, QCM...).
              </p>
            </section>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <h2 className="font-semibold text-gray-900 mb-3">À venir</h2>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune évaluation à venir.</p>
                ) : (
                  <div className="space-y-2">
                    {upcoming.map((hw) => (
                      <ExamCard key={hw.id} hw={hw} />
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <h2 className="font-semibold text-gray-900 mb-3">Passés récemment</h2>
                {previous.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun historique récent.</p>
                ) : (
                  <div className="space-y-2">
                    {previous.slice(-10).reverse().map((hw) => (
                      <ExamCard key={hw.id} hw={hw} compact />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ExamCard: React.FC<{ hw: Homework; compact?: boolean }> = ({ hw, compact = false }) => {
  const isOverdue = isPast(hw.date) && !isToday(hw.date);
  const isDueToday = isToday(hw.date);

  return (
    <article className={`rounded-lg border p-3 ${isOverdue ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-blue-700">{hw.subject.name}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${isDueToday ? 'bg-blue-100 text-blue-700' : isOverdue ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {isDueToday ? "Aujourd'hui" : format(hw.date, 'EEE d MMM', { locale: fr })}
        </span>
      </div>

      {!compact && (
        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
          {hw.description}
        </p>
      )}

      {compact && (
        <p className="text-xs text-gray-600 mt-2 line-clamp-2">
          {hw.description}
        </p>
      )}

      <div className="mt-2 text-[11px] text-gray-500">
        Échéance: {format(hw.date, 'EEEE d MMMM yyyy', { locale: fr })}
        {isPast(hw.date) && !isToday(hw.date) && (
          <span className="inline-flex items-center gap-1 ml-2 text-amber-700">
            <AlertCircle className="w-3.5 h-3.5" />
            dépassé
          </span>
        )}
      </div>
    </article>
  );
};

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{title}</span>
      {icon}
    </div>
    <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
  </div>
);

export default HomeworkExamsPage;
