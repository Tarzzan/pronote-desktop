import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, User, X } from 'lucide-react';
import { useAuthStore } from '../../lib/store/authStore';
import { setClient } from '../../lib/pronote/client';

// ─── Icônes SVG colorées personnalisées ─────────────────────────────────────

const IconHome = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#60a5fa" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconUser = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#a78bfa" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconBook = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#34d399" strokeWidth="2">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </svg>
);
const IconStar = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconFile = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#f472b6" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);
const IconAward = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#fb923c" strokeWidth="2">
    <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
  </svg>
);
const IconChart = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#38bdf8" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const IconUsers = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#f87171" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#818cf8" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconMessage = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#2dd4bf" strokeWidth="2">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#fb923c" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconBell = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#facc15" strokeWidth="2">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);
const IconBriefcase = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#94a3b8" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
  </svg>
);
const IconQCM = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#a3e635" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ─── Définition des menus ─────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: MenuItem[];
  badge?: number;
  color?: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'accueil',
    label: 'Accueil',
    icon: <IconHome />,
    path: '/dashboard',
  },
  {
    id: 'mes-donnees',
    label: 'Mes données',
    icon: <IconUser />,
    children: [
      { id: 'emploi-du-temps', label: 'Mon emploi du temps', icon: <IconCalendar />, path: '/timetable' },
      { id: 'planning-multi', label: 'Planning multisemaine', icon: <IconCalendar />, path: '/timetable/multi' },
      { id: 'liste-eleves', label: 'Liste des élèves', icon: <IconUsers />, path: '/students' },
      { id: 'trombinoscope', label: 'Trombinoscope', icon: <IconUsers />, path: '/trombinoscope' },
      { id: 'liste-profs', label: 'Liste des professeurs', icon: <IconUsers />, path: '/teachers' },
    ],
  },
  {
    id: 'outils-peda',
    label: 'Outils pédagogiques',
    icon: <IconBook />,
    children: [
      { id: 'mes-qcm', label: 'Mes QCM', icon: <IconQCM />, path: '/qcm' },
      { id: 'forums', label: 'Forums pédagogiques', icon: <IconMessage />, path: '/forums' },
      { id: 'progressions', label: 'Mes progressions', icon: <IconChart />, path: '/progressions' },
    ],
  },
  {
    id: 'cahier-textes',
    label: 'Cahier de textes',
    icon: <IconBook />,
    children: [
      { id: 'cdt-taf', label: 'Travail à faire', icon: <IconBook />, path: '/homework' },
      { id: 'cdt-saisie', label: 'Saisie', icon: <IconFile />, path: '/homework/edit' },
      { id: 'cdt-planning', label: 'Planning', icon: <IconCalendar />, path: '/homework/planning' },
      { id: 'cdt-recap', label: 'Récapitulatif', icon: <IconChart />, path: '/homework/summary' },
    ],
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: <IconStar />,
    children: [
      { id: 'notes-releve', label: 'Relevé de notes', icon: <IconStar />, path: '/grades' },
      { id: 'notes-saisie', label: 'Saisie', icon: <IconFile />, path: '/grades/edit' },
      { id: 'notes-appreciations', label: 'Appréciations', icon: <IconFile />, path: '/grades/appreciations' },
    ],
  },
  {
    id: 'bulletins',
    label: 'Bulletins',
    icon: <IconFile />,
    children: [
      { id: 'bulletin', label: 'Bulletin trimestriel', icon: <IconFile />, path: '/bulletins' },
      { id: 'anciens-bulletins', label: 'Anciens bulletins', icon: <IconFile />, path: '/bulletins/archive' },
    ],
  },
  {
    id: 'competences',
    label: 'Compétences',
    icon: <IconAward />,
    children: [
      { id: 'referentiels', label: 'Référentiels', icon: <IconBook />, path: '/competences/referentiels' },
      { id: 'evaluations-comp', label: 'Évaluations', icon: <IconFile />, path: '/competences/evaluations' },
      { id: 'suivis-comp', label: 'Suivis', icon: <IconChart />, path: '/competences/suivis' },
    ],
  },
  {
    id: 'resultats',
    label: 'Résultats',
    icon: <IconChart />,
    children: [
      { id: 'livret-scolaire', label: 'Livret scolaire', icon: <IconBook />, path: '/results/livret' },
      { id: 'tableau-recap', label: 'Tableau récapitulatif', icon: <IconChart />, path: '/results/summary' },
    ],
  },
  {
    id: 'vie-scolaire',
    label: 'Vie scolaire',
    icon: <IconUsers />,
    children: [
      { id: 'appel', label: 'Appel et suivi', icon: <IconUsers />, path: '/attendance/call' },
      { id: 'absences', label: 'Absences et retards', icon: <IconClock />, path: '/attendance' },
      { id: 'punitions', label: 'Punitions et sanctions', icon: <IconFile />, path: '/attendance/sanctions' },
    ],
  },
  {
    id: 'rencontres',
    label: 'Rencontres Parents/Profs',
    icon: <IconUsers />,
    children: [
      { id: 'desiderata', label: 'Desiderata et disponibilités', icon: <IconCalendar />, path: '/meetings' },
    ],
  },
  {
    id: 'emploi-du-temps-section',
    label: 'Emploi du temps',
    icon: <IconCalendar />,
    children: [
      { id: 'edt-perso', label: 'Mon emploi du temps', icon: <IconCalendar />, path: '/timetable' },
      { id: 'salles', label: 'Recherche de salles', icon: <IconBriefcase />, path: '/rooms' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: <IconMessage />,
    children: [
      { id: 'casier', label: 'Casier numérique', icon: <IconBriefcase />, path: '/casier' },
      { id: 'informations', label: 'Informations & sondages', icon: <IconBell />, path: '/informations', badge: 4 },
      { id: 'discussions', label: 'Discussions', icon: <IconMessage />, path: '/messaging', badge: 2 },
      { id: 'nouveau-message', label: 'Nouveau message', icon: <IconMessage />, path: '/messaging/new' },
    ],
  },
  {
    id: 'parametres',
    label: 'Paramètres',
    icon: <IconBriefcase />,
    path: '/settings',
  },
];

// ─── Composant SidebarItem ────────────────────────────────────────────────────

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
          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-200 hover:bg-white/10 hover:translate-x-0.5 text-blue-100 ${
            depth === 0 ? 'font-semibold text-white' : ''
          }`}
          style={{ paddingLeft: `${12 + depth * 12}px` }}
        >
          <span className="flex items-center gap-2">
            {item.icon}
            {item.label}
          </span>
          <span className="transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            <ChevronRight className="w-3 h-3" />
          </span>
        </button>
        {isExpanded && (
          <div className="mt-0.5 border-l border-blue-600/40 ml-5">
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
        `flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-white/20 text-white font-semibold shadow-inner border border-white/20'
            : 'text-blue-100 hover:bg-white/10 hover:text-white hover:translate-x-0.5'
        }`
      }
      style={{ paddingLeft: `${12 + depth * 12}px` }}
    >
      <span className="flex items-center gap-2">
        {item.icon}
        {item.label}
      </span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-sm animate-pulse">
          {item.badge}
        </span>
      )}
    </NavLink>
  );
};

// ─── Composant Sidebar principal ─────────────────────────────────────────────

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
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full z-30 flex flex-col transition-all duration-300 ${
          isOpen ? 'w-72' : 'w-0 lg:w-72'
        } overflow-hidden`}
        style={{
          background: 'linear-gradient(180deg, #1e3a5f 0%, #1e40af 50%, #1d4ed8 100%)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
        }}
      >
        {/* En-tête */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-blue-800 font-black text-lg">P</span>
            </div>
            <div>
              <div className="text-white font-black text-sm tracking-wider">PRONOTE</div>
              <div className="text-blue-300 text-xs font-mono">✨ v{__APP_VERSION__}</div>
            </div>
          </div>
          <button onClick={onToggle} className="text-blue-300 hover:text-white lg:hidden transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profil utilisateur */}
        {clientInfo && (
          <div className="p-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-white text-sm font-semibold truncate">{clientInfo.name}</div>
                <div className="text-blue-300 text-xs truncate flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full inline-block"></span>
                  {clientInfo.establishment}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Menu de navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-transparent">
          {menuItems.map((item) => (
            <SidebarItem key={item.id} item={item} />
          ))}
        </nav>

        {/* Déconnexion */}
        <div className="p-3 border-t border-white/10 bg-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-200 hover:text-white hover:bg-red-500/20 rounded-lg transition-all duration-200 group"
          >
            <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
