import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, BookOpen, MessageSquare, Bell, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import { getClient } from '../lib/pronote/client';
import type { Lesson, Homework, Discussion, Information } from '../types/pronote';
import { format, isToday, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const DashboardPage: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [informations, setInformations] = useState<Information[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const client = getClient();
    if (!client || !client.logged_in) {
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

  useEffect(() => { loadData(); }, [loadData]);

  const todayLessons = lessons.filter((l) => isToday(l.start));
  const unreadDiscussions = discussions.filter((d) => d.unread).length;
  const unreadInfo = informations.filter((i) => !i.read).length;
  const clientName = getClient()?.clientInfo?.name || 'Professeur';

  // Données pour le PieChart (répartition des cours par matière)
  const subjectCounts: Record<string, number> = {};
  lessons.forEach((l) => {
    const name = l.subject?.name || 'Autre';
    subjectCounts[name] = (subjectCounts[name] || 0) + 1;
  });
  const pieData = Object.entries(subjectCounts).map(([name, value]) => ({ name, value }));

  // Données pour le BarChart (devoirs par matière)
  const hwBySubject: Record<string, number> = {};
  homework.forEach((h) => {
    const name = h.subject?.name || 'Autre';
    hwBySubject[name] = (hwBySubject[name] || 0) + 1;
  });
  const barData = Object.entries(hwBySubject).map(([name, count]) => ({ name: name.slice(0, 8), count }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">⏳ Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          👋 Bonjour, {clientName.replace('M. PROFESSEUR', 'Professeur')} !
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 capitalize">
          📅 {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </motion.div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Cours aujourd'hui", value: todayLessons.length, icon: <Calendar className="w-6 h-6 text-blue-600" />, color: 'blue', link: '/timetable', emoji: '📆' },
          { title: 'Devoirs à venir', value: homework.length, icon: <BookOpen className="w-6 h-6 text-green-600" />, color: 'green', link: '/homework', emoji: '📝' },
          { title: 'Messages non lus', value: unreadDiscussions, icon: <MessageSquare className="w-6 h-6 text-purple-600" />, color: 'purple', link: '/messaging', emoji: '💬' },
          { title: 'Informations', value: unreadInfo, icon: <Bell className="w-6 h-6 text-orange-600" />, color: 'orange', link: '/informations', emoji: '🔔' },
        ].map((card, i) => (
          <motion.div key={card.title} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <StatCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* Graphiques */}
      {(pieData.length > 0 || barData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pieData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5"
            >
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                🥧 <span>Répartition des cours de la semaine</span>
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} cours`, 'Nombre']} />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {barData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5"
            >
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                📊 <span>Devoirs par matière</span>
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(value) => [`${value} devoir(s)`, 'Matière']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {barData.map((_, index) => (
                      <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>
      )}

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="📆 Cours du jour" link="/timetable" linkLabel="Voir l'emploi du temps">
          {todayLessons.length === 0 ? (
            <EmptyState message="Aucun cours aujourd'hui 🎉" />
          ) : (
            <div className="space-y-2">
              {todayLessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)}
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="📝 Travail à faire" link="/homework" linkLabel="Voir tous les devoirs">
          {homework.length === 0 ? (
            <EmptyState message="Aucun devoir à venir ✅" />
          ) : (
            <div className="space-y-2">
              {homework.map((hw) => <HomeworkCard key={hw.id} homework={hw} />)}
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="💬 Messagerie" link="/messaging" linkLabel="Voir toutes les discussions">
          {discussions.length === 0 ? (
            <EmptyState message="Aucune discussion" />
          ) : (
            <div className="space-y-2">
              {discussions.map((d) => <DiscussionCard key={d.id} discussion={d} />)}
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="🔔 Informations & sondages" link="/informations" linkLabel="Voir toutes les informations">
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

// ─── Sous-composants ──────────────────────────────────────────────────────────

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string; link: string; emoji: string }> = ({ title, value, icon, color, link, emoji }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 hover:border-blue-400',
    green: 'bg-green-50 border-green-200 hover:border-green-400',
    purple: 'bg-purple-50 border-purple-200 hover:border-purple-400',
    orange: 'bg-orange-50 border-orange-200 hover:border-orange-400',
  };
  return (
    <Link to={link} className={`${colors[color]} border rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 block`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-3xl font-black text-gray-900">{value}</span>
      </div>
      <p className="text-sm text-gray-600">{emoji} {title}</p>
    </Link>
  );
};

const DashboardCard: React.FC<{ title: string; link: string; linkLabel: string; children: React.ReactNode }> = ({ title, link, linkLabel, children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
      <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
      <Link to={link} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
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
  <div
    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    style={{ borderLeftColor: lesson.background_color || '#3b82f6', borderLeftWidth: 4 }}
  >
    <div className="flex-1 min-w-0">
      <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
        {lesson.subject?.name || 'Cours'}
        {lesson.is_cancelled && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-normal">❌ Annulé</span>}
      </div>
      <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
        <Clock className="w-3 h-3" />
        {format(lesson.start, 'HH:mm')} – {format(lesson.end, 'HH:mm')}
        {lesson.classroom && <span className="bg-gray-100 dark:bg-gray-700 px-1.5 rounded">🏫 {lesson.classroom}</span>}
      </div>
    </div>
  </div>
);

const HomeworkCard: React.FC<{ homework: Homework }> = ({ homework }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
    <span className="text-base mt-0.5">{homework.done ? '✅' : '📌'}</span>
    <div className="flex-1 min-w-0">
      <div className="font-medium text-sm text-gray-900 dark:text-white">{homework.subject.name}</div>
      <div className="text-xs text-gray-500 truncate mt-0.5">{homework.description}</div>
      <div className="text-xs text-gray-400 mt-1">📅 Pour le {format(homework.date, 'EEEE d MMM', { locale: fr })}</div>
    </div>
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${homework.done ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
      {homework.done ? 'Rendu' : 'À faire'}
    </span>
  </div>
);

const DiscussionCard: React.FC<{ discussion: Discussion }> = ({ discussion }) => (
  <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${discussion.unread ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-700'}`}>
    <span className="text-base mt-0.5">{discussion.unread ? '💬' : '📨'}</span>
    <div className="flex-1 min-w-0">
      <div className={`text-sm truncate ${discussion.unread ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{discussion.subject}</div>
      <div className="text-xs text-gray-500 mt-0.5">👤 {discussion.creator}</div>
    </div>
    {discussion.unread && <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">Nouveau</span>}
  </div>
);

const InfoCard: React.FC<{ info: Information }> = ({ info }) => (
  <div className={`p-3 rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${!info.read ? 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/20' : 'border-gray-100 dark:border-gray-700'}`}>
    <div className={`text-sm flex items-start gap-2 ${!info.read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
      <span>{!info.read ? '🔔' : '📢'}</span>
      {info.title}
    </div>
    <div className="text-xs text-gray-500 mt-0.5 ml-6">✍️ {info.author}</div>
  </div>
);

export default DashboardPage;
