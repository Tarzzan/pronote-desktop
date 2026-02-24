import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, BookOpen, MessageSquare, Bell, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getClient } from '../lib/pronote/client';
import type { Lesson, Homework, Discussion, Information } from '../types/pronote';
import { format, isToday, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const DashboardPage: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [informations, setInformations] = useState<Information[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const client = getClient();
    if (!client || !client.logged_in) {
      // Réessayer dans 500ms si le client n'est pas encore prêt
      setTimeout(loadData, 500);
      return;
    }
    setLoading(true);
    try {
      const today = new Date();
      const [lessonsData, homeworkData, discussionsData, infoData] = await Promise.allSettled([
        client.getLessons(today),
        client.getHomework(today, addDays(today, 7)),
        client.getDiscussions(),
        client.getInformations(),
      ]);
      if (lessonsData.status === 'fulfilled') setLessons(lessonsData.value);
      if (homeworkData.status === 'fulfilled') setHomework(homeworkData.value.slice(0, 5));
      if (discussionsData.status === 'fulfilled') setDiscussions(discussionsData.value.slice(0, 5));
      if (infoData.status === 'fulfilled') setInformations(infoData.value.slice(0, 3));
    } catch (error) {
      console.error('Erreur chargement tableau de bord:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todayLessons = lessons.filter((l) => isToday(l.start));
  const unreadDiscussions = discussions.filter((d) => d.unread).length;
  const unreadInfo = informations.filter((i) => !i.read).length;
  const clientName = getClient()?.clientInfo?.name || 'Professeur';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bonjour, {clientName.replace('M. PROFESSEUR', 'Professeur')} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Cours aujourd'hui" value={todayLessons.length} icon={<Calendar className="w-6 h-6 text-blue-600" />} color="blue" link="/timetable" />
        <StatCard title="Devoirs à venir" value={homework.length} icon={<BookOpen className="w-6 h-6 text-green-600" />} color="green" link="/homework" />
        <StatCard title="Messages non lus" value={unreadDiscussions} icon={<MessageSquare className="w-6 h-6 text-purple-600" />} color="purple" link="/messaging" />
        <StatCard title="Informations" value={unreadInfo} icon={<Bell className="w-6 h-6 text-orange-600" />} color="orange" link="/informations" />
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="Cours du jour" icon={<Calendar className="w-5 h-5 text-blue-600" />} link="/timetable" linkLabel="Voir l'emploi du temps">
          {todayLessons.length === 0 ? (
            <EmptyState message="Aucun cours aujourd'hui" />
          ) : (
            <div className="space-y-2">
              {todayLessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)}
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Travail à faire" icon={<BookOpen className="w-5 h-5 text-green-600" />} link="/homework" linkLabel="Voir tous les devoirs">
          {homework.length === 0 ? (
            <EmptyState message="Aucun devoir à venir" />
          ) : (
            <div className="space-y-2">
              {homework.map((hw) => <HomeworkCard key={hw.id} homework={hw} />)}
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Messagerie" icon={<MessageSquare className="w-5 h-5 text-purple-600" />} link="/messaging" linkLabel="Voir toutes les discussions">
          {discussions.length === 0 ? (
            <EmptyState message="Aucune discussion" />
          ) : (
            <div className="space-y-2">
              {discussions.map((d) => <DiscussionCard key={d.id} discussion={d} />)}
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Informations & sondages" icon={<Bell className="w-5 h-5 text-orange-600" />} link="/informations" linkLabel="Voir toutes les informations">
          {informations.length === 0 ? (
            <EmptyState message="Aucune information" />
          ) : (
            <div className="space-y-2">
              {informations.map((info) => <InfoCard key={info.id} info={info} />)}
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string; link: string; }> = ({ title, value, icon, color, link }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    green: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    purple: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
    orange: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
  };
  return (
    <Link to={link} className={`${colors[color]} border rounded-xl p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
    </Link>
  );
};

const DashboardCard: React.FC<{ title: string; icon: React.ReactNode; link: string; linkLabel: string; children: React.ReactNode; }> = ({ title, icon, link, linkLabel, children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <Link to={link} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
        {linkLabel} <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-6 text-gray-400 text-sm">{message}</div>
);

const LessonCard: React.FC<{ lesson: Lesson }> = ({ lesson }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700" style={{ borderLeftColor: lesson.background_color || '#4a90d9', borderLeftWidth: 4 }}>
    <div className="flex-1 min-w-0">
      <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
        {lesson.subject?.name || 'Cours'}
        {lesson.is_cancelled && <span className="ml-2 text-xs text-red-500 font-normal">(Annulé)</span>}
      </div>
      <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
        <Clock className="w-3 h-3" />
        {format(lesson.start, 'HH:mm')} – {format(lesson.end, 'HH:mm')}
        {lesson.classroom && <span>· Salle {lesson.classroom}</span>}
      </div>
    </div>
  </div>
);

const HomeworkCard: React.FC<{ homework: Homework }> = ({ homework }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${homework.done ? 'bg-green-400' : 'bg-orange-400'}`} />
    <div className="flex-1 min-w-0">
      <div className="font-medium text-sm text-gray-900 dark:text-white">{homework.subject.name}</div>
      <div className="text-xs text-gray-500 truncate mt-0.5">{homework.description}</div>
      <div className="text-xs text-gray-400 mt-1">Pour le {format(homework.date, 'EEEE d MMM', { locale: fr })}</div>
    </div>
  </div>
);

const DiscussionCard: React.FC<{ discussion: Discussion }> = ({ discussion }) => (
  <div className={`flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 ${discussion.unread ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-700'}`}>
    <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${discussion.unread ? 'text-blue-600' : 'text-gray-400'}`} />
    <div className="flex-1 min-w-0">
      <div className={`text-sm truncate ${discussion.unread ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{discussion.subject}</div>
      <div className="text-xs text-gray-500 mt-0.5">{discussion.creator}</div>
    </div>
    {discussion.unread && <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />}
  </div>
);

const InfoCard: React.FC<{ info: Information }> = ({ info }) => (
  <div className={`p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 ${!info.read ? 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/20' : 'border-gray-100 dark:border-gray-700'}`}>
    <div className={`text-sm ${!info.read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{info.title}</div>
    <div className="text-xs text-gray-500 mt-0.5">{info.author}</div>
  </div>
);

export default DashboardPage;
