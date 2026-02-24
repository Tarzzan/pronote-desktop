import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getClient } from '../lib/pronote/client';
import type { Lesson } from '../types/pronote';

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8h à 18h
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

const TimetablePage: React.FC = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });

  useEffect(() => {
    const loadLessons = async () => {
      const client = getClient();
      if (!client) return;
      setLoading(true);
      try {
        const data = await client.getLessons(weekStart, addDays(weekStart, 6));
        setLessons(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadLessons();
  }, [currentWeek]);

  const getLessonsForDay = (dayIndex: number) => {
    const day = addDays(weekStart, dayIndex);
    return lessons.filter((l) => isSameDay(l.start, day));
  };

  const getTopPercent = (date: Date) => {
    const minutes = date.getHours() * 60 + date.getMinutes();
    const startMinutes = 8 * 60;
    const totalMinutes = 10 * 60;
    return ((minutes - startMinutes) / totalMinutes) * 100;
  };

  const getHeightPercent = (start: Date, end: Date) => {
    const duration = (end.getTime() - start.getTime()) / (1000 * 60);
    const totalMinutes = 10 * 60;
    return (duration / totalMinutes) * 100;
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emploi du temps</h1>
          <p className="text-gray-500 text-sm mt-1">
            Semaine du {format(weekStart, 'd MMM', { locale: fr })} au {format(addDays(weekStart, 4), 'd MMM yyyy', { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setCurrentWeek(new Date())}
            className="px-4 py-2 text-sm font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {/* En-têtes des jours */}
          <div className="grid grid-cols-6 border-b border-gray-200 flex-shrink-0">
            <div className="p-3 text-xs text-gray-400 text-center border-r border-gray-100" />
            {DAYS.map((day, i) => {
              const date = addDays(weekStart, i);
              const isToday = isSameDay(date, new Date());
              return (
                <div
                  key={day}
                  className={`p-3 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <div className={`text-xs font-medium ${isToday ? 'text-blue-700' : 'text-gray-500'}`}>{day}</div>
                  <div className={`text-lg font-bold mt-0.5 ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
                    {format(date, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grille horaire */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-6 relative" style={{ minHeight: '600px' }}>
              {/* Colonne des heures */}
              <div className="border-r border-gray-100">
                {HOURS.map((hour) => (
                  <div key={hour} className="h-16 border-b border-gray-50 flex items-start justify-end pr-2 pt-1">
                    <span className="text-xs text-gray-400">{hour}:00</span>
                  </div>
                ))}
              </div>

              {/* Colonnes des jours */}
              {DAYS.map((_, dayIndex) => {
                const dayLessons = getLessonsForDay(dayIndex);
                return (
                  <div key={dayIndex} className="border-r border-gray-100 last:border-r-0 relative">
                    {/* Lignes horaires */}
                    {HOURS.map((hour) => (
                      <div key={hour} className="h-16 border-b border-gray-50" />
                    ))}

                    {/* Cours */}
                    {dayLessons.map((lesson) => {
                      const top = getTopPercent(lesson.start);
                      const height = Math.max(getHeightPercent(lesson.start, lesson.end), 6);
                      const color = lesson.background_color || '#4a90d9';

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLesson(lesson)}
                          className="absolute left-1 right-1 rounded-lg p-1.5 text-left overflow-hidden hover:opacity-90 transition-opacity shadow-sm"
                          style={{
                            top: `${top}%`,
                            height: `${height}%`,
                            backgroundColor: color + '33',
                            borderLeft: `3px solid ${color}`,
                          }}
                        >
                          <div className="text-xs font-semibold truncate" style={{ color }}>
                            {lesson.subject?.name || 'Cours'}
                          </div>
                          {height > 8 && (
                            <div className="text-xs text-gray-500 truncate">
                              {lesson.classroom && `Salle ${lesson.classroom}`}
                            </div>
                          )}
                          {lesson.is_cancelled && (
                            <div className="text-xs text-red-500 font-medium">Annulé</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Panneau détail cours */}
      {selectedLesson && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Détail du cours</h3>
            <button
              onClick={() => setSelectedLesson(null)}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            <div
              className="p-4 rounded-xl"
              style={{
                backgroundColor: (selectedLesson.background_color || '#4a90d9') + '22',
                borderLeft: `4px solid ${selectedLesson.background_color || '#4a90d9'}`,
              }}
            >
              <div className="text-lg font-bold text-gray-900">
                {selectedLesson.subject?.name || 'Cours'}
              </div>
              {selectedLesson.status && (
                <div className="text-sm text-gray-600 mt-1">{selectedLesson.status}</div>
              )}
              {selectedLesson.is_cancelled && (
                <div className="mt-2 text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full inline-block">
                  Cours annulé
                </div>
              )}
            </div>

            <div className="space-y-3">
              <DetailRow icon={<Clock className="w-4 h-4 text-gray-400" />} label="Horaire">
                {format(selectedLesson.start, 'HH:mm')} – {format(selectedLesson.end, 'HH:mm')}
              </DetailRow>
              <DetailRow icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Date">
                {format(selectedLesson.start, 'EEEE d MMMM yyyy', { locale: fr })}
              </DetailRow>
              {selectedLesson.classroom && (
                <DetailRow icon={<MapPin className="w-4 h-4 text-gray-400" />} label="Salle">
                  {selectedLesson.classroom}
                </DetailRow>
              )}
              {selectedLesson.teacher_name && (
                <DetailRow icon={<User className="w-4 h-4 text-gray-400" />} label="Professeur">
                  {selectedLesson.teacher_name}
                </DetailRow>
              )}
              {selectedLesson.group_name && (
                <DetailRow icon={<User className="w-4 h-4 text-gray-400" />} label="Groupe">
                  {selectedLesson.group_name}
                </DetailRow>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({
  icon, label, children
}) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5">{icon}</div>
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-900">{children}</div>
    </div>
  </div>
);

export default TimetablePage;
