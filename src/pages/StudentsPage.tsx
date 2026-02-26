import React, { useEffect, useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { Calendar, GraduationCap, Users } from 'lucide-react';
import { getClient } from '../lib/pronote/client';
import type { Lesson, Recipient } from '../types/pronote';

type ClassItem = {
  name: string;
  lessons: number;
};

const studentKinds = ['student', 'pupil', 'eleve', 'élève'];

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function isStudentRecipient(recipient: Recipient): boolean {
  const kind = (recipient.kind || '').toLowerCase();
  return studentKinds.some((k) => kind.includes(k));
}

const StudentsPage: React.FC = () => {
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
        console.error('[StudentsPage] Erreur:', error);
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

  const students = useMemo(() => {
    return recipients
      .filter(isStudentRecipient)
      .map((r) => ({ ...r, name: normalize(r.name) }))
      .filter((r) => r.name.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [recipients]);

  const classes = useMemo<ClassItem[]>(() => {
    const map = new Map<string, number>();
    for (const lesson of lessons) {
      const names = [
        ...(lesson.group_name ? [lesson.group_name] : []),
        ...((lesson.group_names || []).filter(Boolean)),
      ];
      for (const rawName of names) {
        const name = normalize(rawName);
        if (!name) continue;
        map.set(name, (map.get(name) || 0) + 1);
      }
    }

    return Array.from(map.entries())
      .map(([name, lessonCount]) => ({ name, lessons: lessonCount }))
      .sort((a, b) => b.lessons - a.lessons || a.name.localeCompare(b.name, 'fr'));
  }, [lessons]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Liste des élèves</h1>
        <p className="text-sm text-gray-500 mt-1">
          Contacts Pronote et classes détectées depuis l&apos;emploi du temps
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard title="Contacts élèves" value={students.length} icon={<Users className="w-5 h-5 text-blue-700" />} />
            <StatCard title="Classes suivies" value={classes.length} icon={<GraduationCap className="w-5 h-5 text-indigo-700" />} />
            <StatCard title="Cours analysés" value={lessons.length} icon={<Calendar className="w-5 h-5 text-emerald-700" />} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Élèves (messagerie)</h2>
              {students.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Aucun contact élève fourni par l&apos;API pour ce compte.
                </p>
              ) : (
                <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                  {students.map((student) => (
                    <div key={student.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="text-sm font-semibold text-gray-900">{student.name}</div>
                      <div className="text-xs text-gray-500 mt-1">Type: {student.kind || 'unknown'}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Classes détectées</h2>
              {classes.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune classe trouvée dans la période analysée.</p>
              ) : (
                <div className="space-y-2">
                  {classes.map((group) => (
                    <div key={group.name} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-gray-900">{group.name}</div>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {group.lessons} cours
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
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

export default StudentsPage;
