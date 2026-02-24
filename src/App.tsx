import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./lib/store/authStore";
import { createClient, setClient } from "./lib/pronote/client";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TimetablePage from "./pages/TimetablePage";
import GradesPage from "./pages/GradesPage";
import HomeworkPage from "./pages/HomeworkPage";
import MessagingPage from "./pages/MessagingPage";
import AttendancePage from "./pages/AttendancePage";
import InformationsPage from "./pages/InformationsPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import MainLayout from "./components/layout/MainLayout";
import ErrorBoundary from "./components/ErrorBoundary";

// ─── Écran de chargement ──────────────────────────────────────────────────────
const LoadingScreen: React.FC<{ message?: string }> = ({ message = "Connexion en cours..." }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
    <div className="text-center">
      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
        <span className="text-blue-700 font-black text-3xl">P</span>
      </div>
      <h1 className="text-white font-bold text-xl mb-2">PRONOTE Desktop</h1>
      <div className="flex items-center justify-center gap-2 text-blue-200 text-sm">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>{message}</span>
      </div>
    </div>
  </div>
);

// ─── Écran d'erreur de démarrage ──────────────────────────────────────────────
const StartupErrorScreen: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Erreur de connexion</h2>
      <p className="text-gray-600 text-sm mb-6">{error}</p>
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Réessayer
        </button>
        <button
          onClick={() => {
            localStorage.removeItem("pronote_credentials");
            window.location.reload();
          }}
          className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          Se reconnecter
        </button>
      </div>
    </div>
  </div>
);

// ─── Composant principal ──────────────────────────────────────────────────────
const App: React.FC = () => {
  const { isAuthenticated, setAuthenticated, setCredentials, setClientInfo, setLoading, setError } = useAuthStore();
  const [appReady, setAppReady] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Initialisation...");

  const initApp = async () => {
    setStartupError(null);
    setAppReady(false);

    const stored = localStorage.getItem("pronote_credentials");
    if (!stored) {
      setAppReady(true);
      return;
    }

    let credentials;
    try {
      credentials = JSON.parse(stored);
    } catch {
      localStorage.removeItem("pronote_credentials");
      setAppReady(true);
      return;
    }

    setLoadingMessage("Connexion à Pronote...");
    setLoading(true);

    try {
      const client = createClient(credentials);
      const success = await client.login();

      if (success) {
        setCredentials(credentials);
        setClientInfo(client.clientInfo);
        setAuthenticated(true);
        setError(null);
        setLoadingMessage("Chargement des données...");
      } else {
        // Connexion échouée : effacer les credentials et aller à la page de login
        localStorage.removeItem("pronote_credentials");
        setClient(null);
        setAuthenticated(false);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[App] Erreur d'initialisation:", msg);

      // Si c'est une erreur réseau, proposer de réessayer
      if (msg.includes('Network') || msg.includes('timeout') || msg.includes('ECONNREFUSED')) {
        setStartupError(`Impossible de joindre le serveur Pronote.\n\nDétail : ${msg}`);
      } else {
        // Autre erreur : effacer les credentials
        localStorage.removeItem("pronote_credentials");
        setClient(null);
        setAuthenticated(false);
      }
    } finally {
      setLoading(false);
      setAppReady(true);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  // Afficher l'écran de chargement
  if (!appReady) {
    return <LoadingScreen message={loadingMessage} />;
  }

  // Afficher l'écran d'erreur réseau avec bouton "Réessayer"
  if (startupError) {
    return <StartupErrorScreen error={startupError} onRetry={initApp} />;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
          />
          <Route
            path="/"
            element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="timetable/multi" element={<PlaceholderPage />} />
            <Route path="grades" element={<GradesPage />} />
            <Route path="grades/edit" element={<PlaceholderPage />} />
            <Route path="grades/appreciations" element={<PlaceholderPage />} />
            <Route path="homework" element={<HomeworkPage />} />
            <Route path="homework/edit" element={<PlaceholderPage />} />
            <Route path="homework/planning" element={<PlaceholderPage />} />
            <Route path="homework/exams" element={<PlaceholderPage />} />
            <Route path="homework/summary" element={<PlaceholderPage />} />
            <Route path="homework/content" element={<PlaceholderPage />} />
            <Route path="messaging" element={<MessagingPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="attendance/call" element={<PlaceholderPage />} />
            <Route path="attendance/sanctions" element={<PlaceholderPage />} />
            <Route path="informations" element={<InformationsPage />} />
            <Route path="services" element={<PlaceholderPage />} />
            <Route path="students" element={<PlaceholderPage />} />
            <Route path="trombinoscope" element={<PlaceholderPage />} />
            <Route path="teachers" element={<PlaceholderPage />} />
            <Route path="resources/students" element={<PlaceholderPage />} />
            <Route path="resources/teachers" element={<PlaceholderPage />} />
            <Route path="qcm" element={<PlaceholderPage />} />
            <Route path="forums" element={<PlaceholderPage />} />
            <Route path="progressions" element={<PlaceholderPage />} />
            <Route path="programs" element={<PlaceholderPage />} />
            <Route path="bulletins" element={<PlaceholderPage />} />
            <Route path="bulletins/appreciations" element={<PlaceholderPage />} />
            <Route path="bulletins/archive" element={<PlaceholderPage />} />
            <Route path="competences/referentiels" element={<PlaceholderPage />} />
            <Route path="competences/evaluations" element={<PlaceholderPage />} />
            <Route path="competences/suivis" element={<PlaceholderPage />} />
            <Route path="competences/bilans" element={<PlaceholderPage />} />
            <Route path="results/livret" element={<PlaceholderPage />} />
            <Route path="results/summary" element={<PlaceholderPage />} />
            <Route path="meetings" element={<PlaceholderPage />} />
            <Route path="rooms" element={<PlaceholderPage />} />
            <Route path="casier" element={<PlaceholderPage />} />
          </Route>
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
