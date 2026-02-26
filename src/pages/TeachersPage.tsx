import React, { useEffect, useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { CalendarRange, UserRound, UsersRound } from 'lucide-react';
import { getClient } from '../lib/pronote/client';
import type { Lesson, Recipient } from '../types/pronote';

type TeacherItem = {
  name: string;
  lessons: number;
  isRecipient: boolean;
};

const teacherKinds = ['teacher', 'prof'];

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function isTeacherRecipient(recipient: Recipient): boolean {
  const kind = (recipient.kind || '').toLowerCase();
  return teacherKinds.some((k) => kind.includes(k));
}

const TeachersPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const client = getClient();
      if (!client) {
        if (!cancelled) {
          setRecipients([]);
          setLessons([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const today = new Date();
        const [recipientsData, lessonsData] = await Promise.all([
          client.getRecipients(),
          client.getLessons(addDays(today, -30), addDays(today, 30)),
        ]);
        if (!cancelled) {
          setRecipients(recipientsData);
          setLessons(lessonsData);
        }
      } catch (error) {
        console.error('[TeachersPage] Erreur:', error);
        if (!cancelled) {
          setRecipients([]);
          setLessons([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const teachers = useMemo<TeacherItem[]>(() => {
    const map = new Map<string, TeacherItem>();

    for (const recipient of recipients) {
      if (!isTeacherRecipient(recipient)) continue;
      const name = normalize(recipient.name);
      if (!name) continue;
      map.set(name, {
        name,
        lessons: map.get(name)?.lessons || 0,
        isRecipient: true,
      });
    }

    for (const lesson of lessons) {
      const names = [
        ...(lesson.teacher_name ? [lesson.teacher_name] : []),
        ...((lesson.teacher_names || []).filter(Boolean)),
      ];
      for (const rawName of names) {
        const name = normalize(rawName);
        if (!name) continue;
        const current = map.get(name);
        map.set(name, {
          name,
          lessons: (current?.lessons || 0) + 1,
          isRecipient: current?.isRecipient || false,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.lessons - a.lessons || a.name.localeCompare(b.name, 'fr')
    );
  }, [lessons, recipients]);

  const withCourses = teachers.filter((t) => t.lessons > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Liste des professeurs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vue consolidée depuis la messagerie et l&apos;emploi du temps
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard title="Professeurs" value={teachers.length} icon={<UsersRound className="w-5 h-5 text-blue-700" />} />
            <StatCard title="Avec cours planifiés" value={withCourses} icon={<CalendarRange className="w-5 h-5 text-emerald-700" />} />
            <StatCard title="Présents en messagerie" value={recipients.filter(isTeacherRecipient).length} icon={<UserRound className="w-5 h-5 text-indigo-700" />} />
          </div>

          <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Répertoire enseignants</h2>
            {teachers.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune donnée professeur disponible.</p>
            ) : (
              <div className="space-y-2">
                {teachers.map((teacher) => (
                  <div key={teacher.name} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-gray-900">{teacher.name}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {teacher.lessons} cours
                        </span>
                        {teacher.isRecipient && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                            contact
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
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

export default TeachersPage;
