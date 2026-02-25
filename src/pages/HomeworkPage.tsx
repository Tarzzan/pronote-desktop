import React, { useEffect, useState } from 'react';
import { BookOpen, Check, Paperclip, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getClient } from '../lib/pronote/client';
import type { Homework } from '../types/pronote';

type FilterType = 'all' | 'todo' | 'done';

const HomeworkPage: React.FC = () => {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('todo');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const loadHomework = async () => {
      const client = getClient();
      if (!client) return;
      setLoading(true);
      try {
        const today = new Date();
        const data = await client.getHomework(today, addDays(today, 30));
        setHomework(data);
      } finally {
        setLoading(false);
      }
    };
    loadHomework();
  }, []);

  const toggleDone = (id: string) => {
    const client = getClient();
    const current = homework.find((hw) => hw.id === id);
    if (!current) return;
    const nextDone = !current.done;

    // Optimistic UI, rollback if backend update fails.
    setHomework((prev) => prev.map((hw) => (hw.id === id ? { ...hw, done: nextDone } : hw)));
    if (!client) return;

    void client.setHomeworkDone(id, nextDone).then((ok) => {
      if (!ok) {
        setHomework((prev) => prev.map((hw) => (hw.id === id ? { ...hw, done: current.done } : hw)));
      }
    });
  };

  const filtered = homework.filter((hw) => {
    if (filter === 'todo') return !hw.done;
    if (filter === 'done') return hw.done;
    return true;
  });

  // Grouper par date
  const grouped = filtered.reduce<Record<string, Homework[]>>((acc, hw) => {
    const key = format(hw.date, 'yyyy-MM-dd');
    if (!acc[key]) acc[key] = [];
    acc[key].push(hw);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  const getDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return 'Demain';
    if (isPast(date)) return `En retard — ${format(date, 'EEEE d MMMM', { locale: fr })}`;
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  };

  const getDateColor = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isPast(date) && !isToday(date)) return 'text-red-600 bg-red-50 border-red-200';
    if (isToday(date)) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (isTomorrow(date)) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-700 bg-gray-50 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cahier de textes</h1>
          <p className="text-gray-500 text-sm mt-1">Travail à faire</p>
        </div>
        {/* Filtres */}
        <div className="flex gap-2">
          {(['all', 'todo', 'done'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-700 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Tous' : f === 'todo' ? 'À faire' : 'Faits'}
              <span className="ml-1.5 text-xs opacity-70">
                ({homework.filter((hw) => f === 'all' ? true : f === 'todo' ? !hw.done : hw.done).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun devoir {filter === 'todo' ? 'à faire' : filter === 'done' ? 'fait' : ''}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateStr) => (
            <div key={dateStr}>
              {/* En-tête de date */}
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border mb-3 ${getDateColor(dateStr)}`}>
                {getDateLabel(dateStr)}
              </div>

              {/* Liste des devoirs */}
              <div className="space-y-2">
                {grouped[dateStr].map((hw) => (
                  <div
                    key={hw.id}
                    className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                      hw.done ? 'opacity-60 border-gray-100' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-4 p-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleDone(hw.id)}
                        className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          hw.done
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {hw.done && <Check className="w-3.5 h-3.5" />}
                      </button>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-blue-700">
                            {hw.subject.name}
                          </span>
                          {hw.files.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Paperclip className="w-3 h-3" />
                              {hw.files.length}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${hw.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {hw.description.length > 150 && expandedId !== hw.id
                            ? hw.description.slice(0, 150) + '...'
                            : hw.description}
                        </p>
                        {hw.description.length > 150 && (
                          <button
                            onClick={() => setExpandedId(expandedId === hw.id ? null : hw.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1"
                          >
                            {expandedId === hw.id ? (
                              <><ChevronUp className="w-3 h-3" /> Voir moins</>
                            ) : (
                              <><ChevronDown className="w-3 h-3" /> Voir plus</>
                            )}
                          </button>
                        )}

                        {/* Pièces jointes */}
                        {hw.files.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {hw.files.map((file, i) => (
                              <a
                                key={i}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition-colors"
                              >
                                <Paperclip className="w-3 h-3" />
                                {file.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeworkPage;
