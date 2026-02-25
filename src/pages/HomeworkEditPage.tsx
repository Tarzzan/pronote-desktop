import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format, addDays } from 'date-fns';
import {
  BookOpen, Save, Loader2, CheckCircle, Calendar,
  Users, FileText, Trash2, Plus
} from 'lucide-react';

interface HomeworkEntry {
  id: string;
  className: string;
  subject: string;
  description: string;
  dueDate: string;
  estimatedMinutes: number;
  type: 'exercise' | 'lesson' | 'test' | 'project';
}

const CLASSES = ['3ème A', '3ème B', '4ème A', '4ème B', '5ème A', '5ème B'];
const SUBJECTS = ['Mathématiques', 'Français', 'Histoire-Géographie', 'Sciences', 'Anglais', 'Espagnol'];
const HOMEWORK_TYPES = [
  { value: 'exercise', label: '📝 Exercice' },
  { value: 'lesson', label: '📖 Leçon à apprendre' },
  { value: 'test', label: '✏️ Contrôle' },
  { value: 'project', label: '🎯 Projet' },
];

const HomeworkEditPage: React.FC = () => {
  const [entries, setEntries] = useState<HomeworkEntry[]>([
    {
      id: '1',
      className: '3ème A',
      subject: 'Mathématiques',
      description: '',
      dueDate: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
      estimatedMinutes: 30,
      type: 'exercise',
    }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateEntry = (id: string, field: keyof HomeworkEntry, value: string | number) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    setSaved(false);
  };

  const addEntry = () => {
    setEntries(prev => [...prev, {
      id: Date.now().toString(),
      className: CLASSES[0],
      subject: SUBJECTS[0],
      description: '',
      dueDate: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
      estimatedMinutes: 30,
      type: 'exercise',
    }]);
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isValid = entries.every(e => e.description.trim().length > 0 && e.dueDate);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          Saisie des devoirs
        </h1>
        <p className="text-sm text-gray-500">Ajoutez des devoirs pour vos classes</p>
      </div>

      <div className="space-y-4 mb-6">
        {entries.map((entry, idx) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
          >
            {/* En-tête de la carte */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-700">Devoir {idx + 1}</span>
              {entries.length > 1 && (
                <button onClick={() => removeEntry(entry.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* Classe + Matière */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Classe
                  </label>
                  <select
                    value={entry.className}
                    onChange={e => updateEntry(entry.id, 'className', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Matière</label>
                  <select
                    value={entry.subject}
                    onChange={e => updateEntry(entry.id, 'subject', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Type + Date d'échéance */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Type</label>
                  <select
                    value={entry.type}
                    onChange={e => updateEntry(entry.id, 'type', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {HOMEWORK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Pour le
                  </label>
                  <input
                    type="date"
                    value={entry.dueDate}
                    onChange={e => updateEntry(entry.id, 'dueDate', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Description du devoir
                </label>
                <textarea
                  value={entry.description}
                  onChange={e => updateEntry(entry.id, 'description', e.target.value)}
                  placeholder="Ex. : Faire les exercices 3, 4 et 5 page 47..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>

              {/* Durée estimée */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Durée estimée : <span className="text-blue-600 font-semibold">{entry.estimatedMinutes} min</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={entry.estimatedMinutes}
                  onChange={e => updateEntry(entry.id, 'estimatedMinutes', parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5 min</span><span>30 min</span><span>1h</span><span>2h</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Ajouter un devoir */}
      <button
        onClick={addEntry}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors mb-6"
      >
        <Plus className="w-4 h-4" /> Ajouter un autre devoir
      </button>

      {/* Bouton sauvegarder */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || !isValid}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm ${
            saved
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-blue-700 hover:bg-blue-800 text-white'
          } disabled:opacity-50`}
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
          ) : saved ? (
            <><CheckCircle className="w-4 h-4" /> Devoirs enregistrés</>
          ) : (
            <><Save className="w-4 h-4" /> Enregistrer les devoirs</>
          )}
        </button>
      </div>
    </div>
  );
};

export default HomeworkEditPage;
