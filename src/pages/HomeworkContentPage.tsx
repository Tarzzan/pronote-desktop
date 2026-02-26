import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Calendar, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { addDays, addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getClient } from '../lib/pronote/client';
import type { Lesson } from '../types/pronote';

const HomeworkContentPage: React.FC = () => {
  const [weekRef, setWeekRef] = useState(new Date());
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);

  const weekStart = useMemo(() => startOfWeek(weekRef, { weekStartsOn: 1 }), [weekRef]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const client = getClient();
      if (!client) {
        if (!cancelled) {
          setLessons([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const data = await client.getLessons(weekStart, addDays(weekStart, 6));
        if (!cancelled) {
          setLessons(data);
          const firstId = data[0]?.id ?? null;
          setSelectedLessonId((prev) => (prev && data.some((l) => l.id === prev) ? prev : firstId));
        }
      } catch (error) {
        console.error('[HomeworkContentPage] Erreur:', error);
        if (!cancelled) setLessons([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  useEffect(() => {
    let cancelled = false;
    const loadContent = async () => {
      if (!selectedLessonId) {
        setContent('');
        return;
      }
      const client = getClient();
      if (!client) return;

      setLoadingContent(true);
      try {
        const data = await client.getLessonContent(selectedLessonId);
        if (!cancelled) setContent(data || '');
      } catch (error) {
        console.error('[HomeworkContentPage] Erreur contenu:', error);
        if (!cancelled) setContent('');
      } finally {
        if (!cancelled) setLoadingContent(false);
      }
    };
    void loadContent();
    return () => {
      cancelled = true;
    };
  }, [selectedLessonId]);

  const sortedLessons = useMemo(
    () => [...lessons].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [lessons]
  );

  const isHtml = /<\/?[a-z][\s\S]*>/i.test(content);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contenu des cours</h1>
          <p className="text-sm text-gray-500 mt-1">
            Semaine du {format(weekStart, 'd MMM', { locale: fr })} au {format(addDays(weekStart, 4), 'd MMM yyyy', { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekRef(subWeeks(weekRef, 1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setWeekRef(new Date())}
            className="px-4 py-2 text-sm font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            Aujourd&apos;hui
          </button>
          <button
            onClick={() => setWeekRef(addWeeks(weekRef, 1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Semaine suivante"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <section className="xl:col-span-1 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Cours de la semaine</h2>
            {sortedLessons.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun cours trouvé sur cette période.</p>
            ) : (
              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {sortedLessons.map((lesson) => {
                  const selected = selectedLessonId === lesson.id;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        selected
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-900">
                        {lesson.subject?.name || 'Cours'}
                      </div>
                      <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(lesson.start, 'EEE d MMM', { locale: fr })} · {format(lesson.start, 'HH:mm')}-{format(lesson.end, 'HH:mm')}
                      </div>
                      {lesson.classroom && <div className="text-xs text-gray-500 mt-1">Salle {lesson.classroom}</div>}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="xl:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BookOpenText className="w-5 h-5 text-blue-600" />
              Contenu saisi
            </h2>
            {!selectedLessonId ? (
              <div className="text-sm text-gray-500">Sélectionnez un cours pour afficher son contenu.</div>
            ) : loadingContent ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : content.trim().length === 0 ? (
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Aucun contenu disponible pour ce cours.
              </div>
            ) : isHtml ? (
              <div
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{content}</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default HomeworkContentPage;
