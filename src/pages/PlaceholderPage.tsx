import React from 'react';
import { Construction } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const PAGE_NAMES: Record<string, string> = {
  '/services': 'Services',
  '/students': 'Liste des élèves',
  '/trombinoscope': 'Trombinoscope',
  '/teachers': 'Liste des professeurs',
  '/resources/students': 'Ressources pour les élèves',
  '/resources/teachers': 'Ressources des enseignants',
  '/qcm': 'Mes QCM',
  '/forums': 'Forums pédagogiques',
  '/progressions': 'Mes progressions',
  '/programs': 'Programmes officiels',
  '/homework/edit': 'Saisie du cahier de textes',
  '/homework/planning': 'Planning des cahiers de textes',
  '/homework/exams': 'Liste des devoirs sur table',
  '/homework/summary': 'Récapitulatif',
  '/homework/content': 'Contenu des cours',
  '/grades/edit': 'Saisie des notes',
  '/grades/appreciations': 'Appréciations du relevé',
  '/bulletins': 'Bulletin',
  '/bulletins/appreciations': 'Appréciations des professeurs',
  '/bulletins/archive': 'Anciens bulletins',
  '/competences/referentiels': 'Référentiels par domaine',
  '/competences/evaluations': 'Saisie des évaluations',
  '/competences/suivis': 'Suivis des compétences',
  '/competences/bilans': 'Bilans de cycle',
  '/results/livret': 'Livret scolaire',
  '/results/summary': 'Tableau récapitulatif',
  '/attendance/call': 'Appel et suivi',
  '/attendance/sanctions': 'Punitions et sanctions',
  '/meetings': 'Rencontres Parents/Profs',
  '/timetable/multi': 'Planning multisemaine',
  '/rooms': 'Recherche de salles',
  '/casier': 'Casier numérique',
};

const PlaceholderPage: React.FC = () => {
  const location = useLocation();
  const pageName = PAGE_NAMES[location.pathname] || 'Cette section';

  return (
    <div className="flex items-center justify-center h-full min-h-96">
      <div className="text-center">
        <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Construction className="w-10 h-10 text-yellow-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{pageName}</h2>
        <p className="text-gray-500 text-sm max-w-sm">
          Cette section est en cours de développement. Elle sera disponible dans une prochaine version de l'application.
        </p>
        <div className="mt-4 text-xs text-gray-400 bg-gray-50 px-4 py-2 rounded-full inline-block">
          v1.0.0 — Pronote Desktop
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
