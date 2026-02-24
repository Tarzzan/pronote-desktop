import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CheckCircle, XCircle, Clock, AlertTriangle,
  Users, ChevronDown, Save, RefreshCw, Loader2
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface Student {
  id: string;
  name: string;
  status: AttendanceStatus;
  lateMinutes?: number;
  comment?: string;
}

interface Lesson {
  id: string;
  subject: string;
  className: string;
  startTime: string;
  endTime: string;
  room?: string;
}

// ─── Données de démo (remplacées par l'API quand disponible) ──────────────────
const DEMO_LESSONS: Lesson[] = [
  { id: '1', subject: 'Mathématiques', className: '3ème A', startTime: '08:00', endTime: '09:00', room: 'Salle 12' },
  { id: '2', subject: 'Mathématiques', className: '4ème B', startTime: '10:00', endTime: '11:00', room: 'Salle 12' },
  { id: '3', subject: 'Mathématiques', className: '5ème C', startTime: '14:00', endTime: '15:00', room: 'Salle 8' },
];

const DEMO_STUDENTS: Record<string, Student[]> = {
  '1': [
    { id: 's1', name: 'Dupont Alice', status: 'present' },
    { id: 's2', name: 'Martin Baptiste', status: 'present' },
    { id: 's3', name: 'Bernard Camille', status: 'present' },
    { id: 's4', name: 'Petit David', status: 'present' },
    { id: 's5', name: 'Robert Emma', status: 'present' },
    { id: 's6', name: 'Moreau Florian', status: 'present' },
    { id: 's7', name: 'Laurent Gaëlle', status: 'present' },
    { id: 's8', name: 'Simon Hugo', status: 'present' },
    { id: 's9', name: 'Michel Inès', status: 'present' },
    { id: 's10', name: 'Lefebvre Julien', status: 'present' },
    { id: 's11', name: 'Leroy Karine', status: 'present' },
    { id: 's12', name: 'Roux Léo', status: 'present' },
  ],
  '2': [
    { id: 's13', name: 'David Marie', status: 'present' },
    { id: 's14', name: 'Bertrand Nathan', status: 'present' },
    { id: 's15', name: 'Morel Océane', status: 'present' },
    { id: 's16', name: 'Fournier Pierre', status: 'present' },
    { id: 's17', name: 'Girard Quentin', status: 'present' },
    { id: 's18', name: 'Bonnet Rachel', status: 'present' },
    { id: 's19', name: 'Dupuis Samuel', status: 'present' },
    { id: 's20', name: 'Lambert Théa', status: 'present' },
  ],
  '3': [
    { id: 's21', name: 'Fontaine Ugo', status: 'present' },
    { id: 's22', name: 'Rousseau Victoire', status: 'present' },
    { id: 's23', name: 'Vincent William', status: 'present' },
    { id: 's24', name: 'Muller Xavier', status: 'present' },
    { id: 's25', name: 'Lecomte Yasmine', status: 'present' },
    { id: 's26', name: 'Masson Zoé', status: 'present' },
  ],
};

// ─── Composant principal ──────────────────────────────────────────────────────
const AttendanceCallPage: React.FC = () => {
  const today = new Date();
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showLessonPicker, setShowLessonPicker] = useState(false);

  // Charger les élèves quand un cours est sélectionné
  useEffect(() => {
    if (selectedLesson) {
      setStudents(DEMO_STUDENTS[selectedLesson.id] || []);
      setSaved(false);
    }
  }, [selectedLesson]);

  // Sélectionner le premier cours par défaut
  useEffect(() => {
    if (DEMO_LESSONS.length > 0 && !selectedLesson) {
      setSelectedLesson(DEMO_LESSONS[0]);
    }
  }, []);

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setStudents(prev => prev.map(s =>
      s.id === studentId ? { ...s, status, lateMinutes: status !== 'late' ? undefined : s.lateMinutes } : s
    ));
    setSaved(false);
  };

  const updateLateMinutes = (studentId: string, minutes: number) => {
    setStudents(prev => prev.map(s =>
      s.id === studentId ? { ...s, lateMinutes: minutes } : s
    ));
  };

  const markAll = (status: AttendanceStatus) => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulation d'un appel API (à remplacer par un vrai endpoint quand disponible)
    await new Promise(r => setTimeout(r, 800));
    setIsSaving(false);
    setSaved(true);
  };

  const stats = {
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    late: students.filter(s => s.status === 'late').length,
    excused: students.filter(s => s.status === 'excused').length,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Appel de présence</h1>
        <p className="text-sm text-gray-500">
          {format(today, 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Sélecteur de cours */}
      <div className="relative mb-6">
        <button
          onClick={() => setShowLessonPicker(!showLessonPicker)}
          className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm hover:border-blue-300 transition-colors"
        >
          {selectedLesson ? (
            <div className="text-left">
              <div className="font-semibold text-gray-900">{selectedLesson.subject} — {selectedLesson.className}</div>
              <div className="text-sm text-gray-500">
                {selectedLesson.startTime} – {selectedLesson.endTime}
                {selectedLesson.room && ` · ${selectedLesson.room}`}
              </div>
            </div>
          ) : (
            <span className="text-gray-400">Sélectionner un cours</span>
          )}
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showLessonPicker ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showLessonPicker && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden"
            >
              {DEMO_LESSONS.map(lesson => (
                <button
                  key={lesson.id}
                  onClick={() => { setSelectedLesson(lesson); setShowLessonPicker(false); }}
                  className={`w-full text-left px-5 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${selectedLesson?.id === lesson.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="font-medium text-gray-900">{lesson.subject} — {lesson.className}</div>
                  <div className="text-sm text-gray-500">{lesson.startTime} – {lesson.endTime}{lesson.room && ` · ${lesson.room}`}</div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectedLesson && students.length > 0 && (
        <>
          {/* Statistiques */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <StatCard icon={<CheckCircle className="w-5 h-5 text-green-600" />} label="Présents" value={stats.present} total={students.length} color="green" />
            <StatCard icon={<XCircle className="w-5 h-5 text-red-600" />} label="Absents" value={stats.absent} total={students.length} color="red" />
            <StatCard icon={<Clock className="w-5 h-5 text-orange-500" />} label="En retard" value={stats.late} total={students.length} color="orange" />
            <StatCard icon={<AlertTriangle className="w-5 h-5 text-blue-500" />} label="Excusés" value={stats.excused} total={students.length} color="blue" />
          </div>

          {/* Actions rapides */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-gray-500 font-medium">Tout marquer :</span>
            <button onClick={() => markAll('present')} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
              <CheckCircle className="w-4 h-4" /> Présent
            </button>
            <button onClick={() => markAll('absent')} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
              <XCircle className="w-4 h-4" /> Absent
            </button>
            <button onClick={() => markAll('excused')} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
              <AlertTriangle className="w-4 h-4" /> Excusé
            </button>
          </div>

          {/* Liste des élèves */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-200">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">{students.length} élèves</span>
            </div>
            <div className="divide-y divide-gray-50">
              {students.map((student, idx) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Numéro + nom */}
                  <span className="text-xs text-gray-400 w-6 text-right">{idx + 1}</span>
                  <span className="flex-1 font-medium text-gray-800 text-sm">{student.name}</span>

                  {/* Boutons de statut */}
                  <div className="flex items-center gap-1.5">
                    <StatusButton
                      active={student.status === 'present'}
                      onClick={() => updateStatus(student.id, 'present')}
                      color="green"
                      icon={<CheckCircle className="w-4 h-4" />}
                      label="P"
                    />
                    <StatusButton
                      active={student.status === 'absent'}
                      onClick={() => updateStatus(student.id, 'absent')}
                      color="red"
                      icon={<XCircle className="w-4 h-4" />}
                      label="A"
                    />
                    <StatusButton
                      active={student.status === 'late'}
                      onClick={() => updateStatus(student.id, 'late')}
                      color="orange"
                      icon={<Clock className="w-4 h-4" />}
                      label="R"
                    />
                    <StatusButton
                      active={student.status === 'excused'}
                      onClick={() => updateStatus(student.id, 'excused')}
                      color="blue"
                      icon={<AlertTriangle className="w-4 h-4" />}
                      label="E"
                    />
                  </div>

                  {/* Champ minutes si retard */}
                  <AnimatePresence>
                    {student.status === 'late' && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="flex items-center gap-1"
                      >
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={student.lateMinutes || ''}
                          onChange={e => updateLateMinutes(student.id, parseInt(e.target.value) || 0)}
                          placeholder="min"
                          className="w-16 text-center text-sm border border-orange-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-300"
                        />
                        <span className="text-xs text-gray-400">min</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bouton sauvegarder */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving || saved}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                saved
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-blue-700 hover:bg-blue-800 text-white shadow-sm'
              } disabled:opacity-60`}
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
              ) : saved ? (
                <><CheckCircle className="w-4 h-4" /> Appel enregistré</>
              ) : (
                <><Save className="w-4 h-4" /> Enregistrer l'appel</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Sous-composants ──────────────────────────────────────────────────────────
const StatusButton: React.FC<{
  active: boolean; onClick: () => void; color: string;
  icon: React.ReactNode; label: string;
}> = ({ active, onClick, color, icon, label }) => {
  const colors: Record<string, string> = {
    green: active ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-400 border-gray-200 hover:border-green-300 hover:text-green-600',
    red: active ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-400 border-gray-200 hover:border-red-300 hover:text-red-600',
    orange: active ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-400 border-gray-200 hover:border-orange-300 hover:text-orange-500',
    blue: active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-600',
  };
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${colors[color]}`}
    >
      {icon}
    </button>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode; label: string; value: number; total: number; color: string;
}> = ({ icon, label, value, total, color }) => {
  const colors: Record<string, string> = {
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
    blue: 'bg-blue-50 border-blue-200',
  };
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={`${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-1">
        {icon}
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="text-xs text-gray-600">{label}</p>
      <p className="text-xs text-gray-400">{pct}%</p>
    </div>
  );
};

export default AttendanceCallPage;
