import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Calendar, BookOpen, Star, FileText, Users,
  MessageSquare, Bell, Clock, ChevronDown, ChevronRight,
  LogOut, User, Menu, X, BookMarked, Award, BarChart2,
  Briefcase, Settings
} from 'lucide-react';
import { useAuthStore } from '../../lib/store/authStore';
import { setClient } from '../../lib/pronote/client';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: MenuItem[];
  badge?: number;
}

const menuItems: MenuItem[] = [
  {
    id: 'accueil',
    label: 'Accueil',
    icon: <Home className="w-4 h-4" />,
    path: '/dashboard',
  },
  {
    id: 'mes-donnees',
    label: 'Mes données',
    icon: <User className="w-4 h-4" />,
    children: [
      { id: 'emploi-du-temps', label: 'Mon emploi du temps', icon: <Calendar className="w-4 h-4" />, path: '/timetable' },
      { id: 'planning-multi', label: 'Mon planning multisemaine', icon: <Calendar className="w-4 h-4" />, path: '/timetable/multi' },
      { id: 'services', label: 'Services', icon: <Briefcase className="w-4 h-4" />, path: '/services' },
      { id: 'liste-eleves', label: 'Liste des élèves', icon: <Users className="w-4 h-4" />, path: '/students' },
      { id: 'trombinoscope', label: 'Trombinoscope', icon: <Users className="w-4 h-4" />, path: '/trombinoscope' },
      { id: 'liste-profs', label: 'Liste des professeurs', icon: <Users className="w-4 h-4" />, path: '/teachers' },
    ],
  },
  {
    id: 'outils-peda',
    label: 'Outils pédagogiques',
    icon: <BookMarked className="w-4 h-4" />,
    children: [
      { id: 'ressources-eleves', label: 'Ressources pour les élèves', icon: <BookOpen className="w-4 h-4" />, path: '/resources/students' },
      { id: 'ressources-profs', label: 'Ressources des enseignants', icon: <BookOpen className="w-4 h-4" />, path: '/resources/teachers' },
      { id: 'mes-qcm', label: 'Mes QCM', icon: <FileText className="w-4 h-4" />, path: '/qcm' },
      { id: 'forums', label: 'Forums pédagogiques', icon: <MessageSquare className="w-4 h-4" />, path: '/forums' },
      { id: 'progressions', label: 'Mes progressions', icon: <BarChart2 className="w-4 h-4" />, path: '/progressions' },
      { id: 'programmes', label: 'Programmes officiels', icon: <BookOpen className="w-4 h-4" />, path: '/programs' },
    ],
  },
  {
    id: 'cahier-textes',
    label: 'Cahier de textes',
    icon: <BookOpen className="w-4 h-4" />,
    children: [
      { id: 'cdt-saisie', label: 'Saisie', icon: <FileText className="w-4 h-4" />, path: '/homework/edit' },
      { id: 'cdt-planning', label: 'Planning des cahiers de textes', icon: <Calendar className="w-4 h-4" />, path: '/homework/planning' },
      { id: 'cdt-devoirs-table', label: 'Liste des devoirs sur table', icon: <FileText className="w-4 h-4" />, path: '/homework/exams' },
      { id: 'cdt-recap', label: 'Récapitulatif', icon: <BarChart2 className="w-4 h-4" />, path: '/homework/summary' },
      { id: 'cdt-contenu', label: 'Contenu des cours', icon: <BookOpen className="w-4 h-4" />, path: '/homework/content' },
      { id: 'cdt-taf', label: 'Travail à faire', icon: <BookOpen className="w-4 h-4" />, path: '/homework' },
    ],
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: <Star className="w-4 h-4" />,
    children: [
      { id: 'notes-saisie', label: 'Saisie', icon: <FileText className="w-4 h-4" />, path: '/grades/edit' },
      { id: 'notes-releve', label: 'Relevé', icon: <BarChart2 className="w-4 h-4" />, path: '/grades' },
      { id: 'notes-appreciations', label: 'Appréciations du relevé', icon: <FileText className="w-4 h-4" />, path: '/grades/appreciations' },
    ],
  },
  {
    id: 'bulletins',
    label: 'Bulletins',
    icon: <FileText className="w-4 h-4" />,
    children: [
      { id: 'bulletin', label: 'Bulletin', icon: <FileText className="w-4 h-4" />, path: '/bulletins' },
      { id: 'appreciations-bulletin', label: 'Appréciations des professeurs', icon: <FileText className="w-4 h-4" />, path: '/bulletins/appreciations' },
      { id: 'anciens-bulletins', label: 'Anciens bulletins', icon: <FileText className="w-4 h-4" />, path: '/bulletins/archive' },
    ],
  },
  {
    id: 'competences',
    label: 'Compétences',
    icon: <Award className="w-4 h-4" />,
    children: [
      { id: 'referentiels', label: 'Référentiels par domaine', icon: <BookOpen className="w-4 h-4" />, path: '/competences/referentiels' },
      { id: 'evaluations-comp', label: 'Saisie des évaluations', icon: <FileText className="w-4 h-4" />, path: '/competences/evaluations' },
      { id: 'suivis-comp', label: 'Suivis des compétences', icon: <BarChart2 className="w-4 h-4" />, path: '/competences/suivis' },
      { id: 'bilans-cycle', label: 'Bilans de cycle', icon: <BarChart2 className="w-4 h-4" />, path: '/competences/bilans' },
    ],
  },
  {
    id: 'resultats',
    label: 'Résultats',
    icon: <BarChart2 className="w-4 h-4" />,
    children: [
      { id: 'livret-scolaire', label: 'Livret scolaire', icon: <BookOpen className="w-4 h-4" />, path: '/results/livret' },
      { id: 'tableau-recap', label: 'Tableau récapitulatif', icon: <BarChart2 className="w-4 h-4" />, path: '/results/summary' },
    ],
  },
  {
    id: 'vie-scolaire',
    label: 'Vie scolaire',
    icon: <Users className="w-4 h-4" />,
    children: [
      { id: 'appel', label: 'Appel et suivi', icon: <Users className="w-4 h-4" />, path: '/attendance/call' },
      { id: 'absences', label: 'Absences et retards', icon: <Clock className="w-4 h-4" />, path: '/attendance' },
      { id: 'punitions', label: 'Punitions et sanctions', icon: <FileText className="w-4 h-4" />, path: '/attendance/sanctions' },
    ],
  },
  {
    id: 'rencontres',
    label: 'Rencontres Parents/Profs',
    icon: <Users className="w-4 h-4" />,
    children: [
      { id: 'desiderata', label: 'Desiderata et disponibilités', icon: <Calendar className="w-4 h-4" />, path: '/meetings' },
    ],
  },
  {
    id: 'emploi-du-temps-section',
    label: 'Emploi du temps',
    icon: <Calendar className="w-4 h-4" />,
    children: [
      { id: 'edt-perso', label: 'Mon emploi du temps', icon: <Calendar className="w-4 h-4" />, path: '/timetable' },
      { id: 'edt-multi', label: 'Mon planning multisemaine', icon: <Calendar className="w-4 h-4" />, path: '/timetable/multi' },
      { id: 'salles', label: 'Recherche de salles/matériels', icon: <Settings className="w-4 h-4" />, path: '/rooms' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: <MessageSquare className="w-4 h-4" />,
    children: [
      { id: 'casier', label: 'Casier numérique', icon: <Briefcase className="w-4 h-4" />, path: '/casier' },
      { id: 'informations', label: 'Informations & sondages', icon: <Bell className="w-4 h-4" />, path: '/informations', badge: 4 },
      { id: 'discussions', label: 'Discussions', icon: <MessageSquare className="w-4 h-4" />, path: '/messaging', badge: 2 },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const SidebarItem: React.FC<{ item: MenuItem; depth?: number }> = ({ item, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors hover:bg-blue-700/50 text-blue-100 ${
            depth === 0 ? 'font-semibold text-white' : ''
          }`}
          style={{ paddingLeft: `${12 + depth * 12}px` }}
        >
          <span className="flex items-center gap-2">
            {item.icon}
            {item.label}
          </span>
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        {isExpanded && (
          <div className="mt-1">
            {item.children!.map((child) => (
              <SidebarItem key={child.id} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path || '#'}
      className={({ isActive }) =>
        `flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
          isActive
            ? 'bg-white text-blue-800 font-semibold'
            : 'text-blue-100 hover:bg-blue-700/50'
        }`
      }
      style={{ paddingLeft: `${12 + depth * 12}px` }}
    >
      <span className="flex items-center gap-2">
        {item.icon}
        {item.label}
      </span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {item.badge}
        </span>
      )}
    </NavLink>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();
  const { clientInfo, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    setClient(null);
    localStorage.removeItem('pronote_credentials');
    navigate('/login');
  };

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-gradient-to-b from-blue-900 to-blue-800 z-30 flex flex-col transition-all duration-300 ${
          isOpen ? 'w-72' : 'w-0 lg:w-72'
        } overflow-hidden`}
      >
        {/* En-tête */}
        <div className="p-4 border-b border-blue-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow">
              <span className="text-blue-800 font-black text-lg">P</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm">PRONOTE</div>
              <div className="text-blue-300 text-xs">v1.2.0</div>
            </div>
          </div>
          <button onClick={onToggle} className="text-blue-300 hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profil utilisateur */}
        {clientInfo && (
          <div className="p-4 border-b border-blue-700/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-white text-sm font-medium truncate">{clientInfo.name}</div>
                <div className="text-blue-300 text-xs truncate">{clientInfo.establishment}</div>
              </div>
            </div>
          </div>
        )}

        {/* Menu de navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          {menuItems.map((item) => (
            <SidebarItem key={item.id} item={item} />
          ))}
        </nav>

        {/* Déconnexion */}
        <div className="p-3 border-t border-blue-700/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-200 hover:text-white hover:bg-blue-700/50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
