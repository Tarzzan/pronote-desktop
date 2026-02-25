import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, QrCode, Loader2, BookmarkCheck, Wifi, WifiOff } from 'lucide-react';
import { useAuthStore } from '../lib/store/authStore';
import { createClient, setClient } from '../lib/pronote/client';
import { generateUUID } from '../lib/pronote/crypto';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuthenticated, setCredentials, setClientInfo, setLoading, setError, isLoading, error } = useAuthStore();

  // Mémorisation des identifiants via localStorage
  const [url, setUrl] = useState(() => localStorage.getItem('pronote_saved_url') || 'https://demo.index-education.net/pronote/professeur.html');
  const [username, setUsername] = useState(() => localStorage.getItem('pronote_saved_username') || 'demonstration');
  const [password, setPassword] = useState(() => localStorage.getItem('pronote_saved_password') || 'pronotevs');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('pronote_remember') === 'true');
  const [showPassword, setShowPassword] = useState(false);
  const [showQrMode, setShowQrMode] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNetworkError(false);

    try {
      const credentials = {
        pronote_url: url,
        username,
        password,
        uuid: generateUUID(),
        device_name: 'Pronote Desktop Linux',
      };

      const client = createClient(credentials);
      const success = await client.login();

      if (success) {
        // Mémoriser les identifiants si demandé
        if (rememberMe) {
          localStorage.setItem('pronote_saved_url', url);
          localStorage.setItem('pronote_saved_username', username);
          localStorage.setItem('pronote_saved_password', password);
          localStorage.setItem('pronote_remember', 'true');
        } else {
          localStorage.removeItem('pronote_saved_url');
          localStorage.removeItem('pronote_saved_username');
          localStorage.removeItem('pronote_saved_password');
          localStorage.setItem('pronote_remember', 'false');
        }
        setCredentials(credentials);
        setClientInfo(client.clientInfo);
        setAuthenticated(true);
        localStorage.setItem('pronote_credentials', JSON.stringify(credentials));
        navigate('/dashboard');
      } else {
        setError('Identifiants incorrects ou serveur inaccessible. Vérifiez vos informations de connexion.');
        setClient(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion inconnue';
      // Détecter les erreurs réseau
      if (message.includes('Network') || message.includes('ECONNREFUSED') || message.includes('fetch')) {
        setNetworkError(true);
        setError('Impossible de joindre le serveur Pronote. Vérifiez votre connexion internet et l\'URL saisie.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 p-8 text-white text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-blue-800 font-black text-2xl">P</span>
          </div>
          <h1 className="text-2xl font-bold">PRONOTE</h1>
          <p className="text-blue-200 text-sm mt-1">Application de bureau — Linux / macOS</p>
          <p className="text-blue-300 text-xs mt-1">v{__APP_VERSION__}</p>
        </div>

        {/* Formulaire */}
        <div className="p-8">
          {/* Onglets */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setShowQrMode(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !showQrMode ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LogIn className="w-4 h-4 inline mr-2" />
              Identifiants
            </button>
            <button
              type="button"
              onClick={() => setShowQrMode(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                showQrMode ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <QrCode className="w-4 h-4 inline mr-2" />
              QR Code
            </button>
          </div>

          {!showQrMode ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse du serveur Pronote
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://monecole.index-education.net/pronote/..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                />
              </div>

              {/* Identifiant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Identifiant
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Votre identifiant Pronote"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                />
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Se souvenir de moi */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    rememberMe ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}
                >
                  {rememberMe && <BookmarkCheck className="w-3 h-3 text-white" />}
                </button>
                <label
                  onClick={() => setRememberMe(!rememberMe)}
                  className="text-sm text-gray-600 cursor-pointer select-none"
                >
                  Se souvenir de mes identifiants
                </label>
              </div>

              {/* Erreur */}
              {error && (
                <div className={`border px-4 py-3 rounded-lg text-sm flex items-start gap-2 ${
                  networkError
                    ? 'bg-orange-50 border-orange-200 text-orange-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {networkError
                    ? <WifiOff className="w-4 h-4 mt-0.5 shrink-0" />
                    : <Wifi className="w-4 h-4 mt-0.5 shrink-0" />
                  }
                  <span>{error}</span>
                </div>
              )}

              {/* Bouton connexion */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Se connecter
                  </>
                )}
              </button>
            </form>
          ) : (
            <QrCodeLogin />
          )}
        </div>

        {/* Pied de page */}
        <div className="px-8 pb-6 text-center text-xs text-gray-400">
          Application non officielle — Index Éducation
        </div>
      </div>
    </div>
  );
};

const QrCodeLogin: React.FC = () => {
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'pin' | 'scan' | 'confirm'>('pin');

  return (
    <div className="text-center space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <QrCode className="w-8 h-8 mx-auto mb-2 text-blue-500" />
        <p className="font-medium mb-1">Connexion par QR Code</p>
        <p className="text-blue-600 text-xs">
          Cette fonctionnalité nécessite une connexion initiale par identifiant/mot de passe
          pour générer un QR code. Utilisez d'abord l'onglet "Identifiants".
        </p>
      </div>
      {step === 'pin' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Code PIN à 4 chiffres
          </label>
          <input
            type="text"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            disabled={pin.length !== 4}
            className="mt-3 w-full bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors"
            onClick={() => setStep('scan')}
          >
            Générer le QR Code
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
