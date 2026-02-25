import React, { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Bell, Sun, Moon } from 'lucide-react';
import { AnimatePresence, motion, type Transition } from 'framer-motion';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../lib/store/authStore';

const API_BASE = 'http://127.0.0.1:5174/api';

const getInitialTheme = (): boolean => {
  try {
    const stored = localStorage.getItem('pronote_dark_mode');
    if (stored !== null) return stored === 'true';
  } catch (error) {
    console.debug('[MainLayout] Impossible de lire pronote_dark_mode:', error);
  }
  return false;
};

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition: Transition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.22,
};

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState<boolean>(getInitialTheme);
  const { clientInfo } = useAuthStore();
  const location = useLocation();

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('pronote_dark_mode', String(next));
        // Persister dans config.json via l'API (non bloquant)
        fetch(`${API_BASE}/config`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: next ? 'dark' : 'light' }),
        }).catch((error) => {
          console.debug('[MainLayout] Persistance thème échouée:', error);
        });
      } catch (error) {
        console.debug('[MainLayout] Erreur toggleDarkMode:', error);
      }
      return next;
    });
  }, []);

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Contenu principal */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-72' : ''
        }`}
      >
        {/* Barre supérieure */}
        <header className={`border-b px-4 py-3 flex items-center justify-between shadow-sm flex-shrink-0 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Basculer le menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                📚 {clientInfo?.establishment || 'PRONOTE'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button className={`relative p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white animate-pulse"></span>
            </button>

            {/* Dark mode */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-all duration-300 ${
                darkMode
                  ? 'hover:bg-gray-700 text-yellow-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Basculer le thème"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Avatar */}
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
              {clientInfo?.name?.charAt(0) || 'P'}
            </div>
          </div>
        </header>

        {/* Zone de contenu avec animation */}
        <main className={`flex-1 overflow-y-auto p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
