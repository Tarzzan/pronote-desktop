import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Award, BookOpen, CheckCircle, Circle, AlertCircle, XCircle } from 'lucide-react';

interface Competence {
  id: string;
  domain: string;
  name: string;
  level: 0 | 1 | 2 | 3 | 4; // 0=non évalué, 1=insuffisant, 2=fragile, 3=satisfaisant, 4=très bien
  date?: string;
}

const LEVELS = [
  { value: 0, label: 'Non évalué', color: 'bg-gray-100 text-gray-500', icon: <Circle className="w-4 h-4" /> },
  { value: 1, label: 'Insuffisant', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
  { value: 2, label: 'Fragile', color: 'bg-orange-100 text-orange-700', icon: <AlertCircle className="w-4 h-4" /> },
  { value: 3, label: 'Satisfaisant', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="w-4 h-4" /> },
  { value: 4, label: 'Très bien', color: 'bg-green-100 text-green-700', icon: <Award className="w-4 h-4" /> },
];

// Données de démonstration structurées par domaine
const DEMO_COMPETENCES: Competence[] = [
  // Domaine 1 : Les langages
  { id: '1', domain: 'D1 — Les langages pour penser et communiquer', name: 'Comprendre, s\'exprimer en utilisant la langue française', level: 4 },
  { id: '2', domain: 'D1 — Les langages pour penser et communiquer', name: 'Comprendre, s\'exprimer en utilisant les langages mathématiques', level: 3 },
  { id: '3', domain: 'D1 — Les langages pour penser et communiquer', name: 'Comprendre, s\'exprimer en utilisant les langages des arts', level: 3 },
  { id: '4', domain: 'D1 — Les langages pour penser et communiquer', name: 'Comprendre, s\'exprimer en utilisant une langue étrangère', level: 2 },
  // Domaine 2 : Méthodes et outils
  { id: '5', domain: 'D2 — Les méthodes et outils pour apprendre', name: 'Organisation du travail personnel', level: 4 },
  { id: '6', domain: 'D2 — Les méthodes et outils pour apprendre', name: 'Coopération et réalisation de projets', level: 3 },
  { id: '7', domain: 'D2 — Les méthodes et outils pour apprendre', name: 'Médias, démarches de recherche et de traitement de l\'information', level: 3 },
  { id: '8', domain: 'D2 — Les méthodes et outils pour apprendre', name: 'Outils numériques pour échanger et communiquer', level: 4 },
  // Domaine 3 : Formation de la personne
  { id: '9', domain: 'D3 — La formation de la personne et du citoyen', name: 'Expression de la sensibilité et des opinions', level: 3 },
  { id: '10', domain: 'D3 — La formation de la personne et du citoyen', name: 'La règle et le droit', level: 4 },
  { id: '11', domain: 'D3 — La formation de la personne et du citoyen', name: 'Réflexion et discernement', level: 3 },
  // Domaine 4 : Systèmes naturels
  { id: '12', domain: 'D4 — Les systèmes naturels et les systèmes techniques', name: 'Démarches scientifiques', level: 2 },
  { id: '13', domain: 'D4 — Les systèmes naturels et les systèmes techniques', name: 'Conception, création, réalisation', level: 3 },
  { id: '14', domain: 'D4 — Les systèmes naturels et les systèmes techniques', name: 'Responsabilités individuelles et collectives', level: 3 },
  // Domaine 5 : Représentations du monde
  { id: '15', domain: 'D5 — Les représentations du monde et l\'activité humaine', name: 'L\'espace et le temps', level: 4 },
  { id: '16', domain: 'D5 — Les représentations du monde et l\'activité humaine', name: 'Organisation et transformations de la société', level: 3 },
  { id: '17', domain: 'D5 — Les représentations du monde et l\'activité humaine', name: 'Invention, élaboration, production', level: 2 },
];

const CompetencesPage: React.FC = () => {
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    // Simuler un chargement API
    await new Promise((r) => setTimeout(r, 600));
    setCompetences(DEMO_COMPETENCES);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const domains = ['all', ...Array.from(new Set(competences.map((c) => c.domain)))];
  const filtered = selectedDomain === 'all' ? competences : competences.filter((c) => c.domain === selectedDomain);
  const grouped: Record<string, Competence[]> = {};
  filtered.forEach((c) => {
    if (!grouped[c.domain]) grouped[c.domain] = [];
    grouped[c.domain].push(c);
  });

  // Stats globales
  const stats = LEVELS.slice(1).map((l) => ({
    ...l,
    count: competences.filter((c) => c.level === l.value).length,
  }));

  const getLevelInfo = (level: number) => LEVELS[level] || LEVELS[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">⏳ Chargement des compétences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          🏅 <span>Compétences</span>
        </h1>
        <p className="text-gray-500 mt-1">Suivi des compétences par domaine du socle commun</p>
      </motion.div>

      {/* Résumé statistique */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`${s.color} rounded-xl p-4 border border-current/20`}
          >
            <div className="flex items-center justify-between mb-1">
              {s.icon}
              <span className="text-2xl font-black">{s.count}</span>
            </div>
            <p className="text-xs font-medium">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filtre par domaine */}
      <div className="flex gap-2 flex-wrap">
        {domains.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDomain(d)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              selectedDomain === d
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {d === 'all' ? '🌐 Tous les domaines' : d.split('—')[0].trim()}
          </button>
        ))}
      </div>

      {/* Grille des compétences par domaine */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([domain, items], di) => (
          <motion.div
            key={domain}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: di * 0.1 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                {domain}
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map((comp, i) => {
                const levelInfo = getLevelInfo(comp.level);
                return (
                  <motion.div
                    key={comp.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm text-gray-700 flex-1 pr-4">{comp.name}</p>
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 ${levelInfo.color}`}>
                      {levelInfo.icon}
                      {levelInfo.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CompetencesPage;
