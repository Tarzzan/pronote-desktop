import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, X, Loader2, CheckCircle, Users, MessageSquare } from 'lucide-react';
import { getClient } from '../lib/pronote/client';
import type { Recipient } from '../types/pronote';

const NewMessagePage: React.FC = () => {
  const [availableRecipients, setAvailableRecipients] = useState<Recipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showRecipientList, setShowRecipientList] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecipients = async () => {
      const client = getClient();
      if (!client) return;
      const recipients = await client.getRecipients();
      setAvailableRecipients(recipients);
    };
    void loadRecipients();
  }, []);

  const filteredRecipients = useMemo(
    () =>
      availableRecipients.filter(
        (r) =>
          r.name.toLowerCase().includes(recipientSearch.toLowerCase()) &&
          !selectedRecipients.find((s) => s.id === r.id)
      ),
    [availableRecipients, recipientSearch, selectedRecipients]
  );

  const addRecipient = (r: Recipient) => {
    setSelectedRecipients(prev => [...prev, r]);
    setRecipientSearch('');
    setShowRecipientList(false);
  };

  const removeRecipient = (id: string) => {
    setSelectedRecipients(prev => prev.filter(r => r.id !== id));
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || selectedRecipients.length === 0) return;
    const client = getClient();
    if (!client) return;

    setSendError(null);
    setIsSending(true);
    const ok = await client.createDiscussion(
      selectedRecipients.map((r) => r.id),
      subject.trim(),
      body.trim()
    );
    setIsSending(false);
    if (ok) {
      setSent(true);
      return;
    }
    setSendError("Échec de l'envoi. Vérifiez la connexion Pronote.");
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    teacher: 'bg-blue-100 text-blue-700',
    parent: 'bg-green-100 text-green-700',
    unknown: 'bg-gray-100 text-gray-700',
  };
  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    teacher: 'Enseignant',
    parent: 'Parent',
    unknown: 'Contact',
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </motion.div>
        <h2 className="text-lg font-semibold text-gray-800">Message envoyé !</h2>
        <p className="text-sm text-gray-500">Votre message a été transmis avec succès.</p>
        <button
          onClick={() => { setSent(false); setSubject(''); setBody(''); setSelectedRecipients([]); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Nouveau message
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          Nouveau message
        </h1>
        <p className="text-sm text-gray-500">Composez un message à destination de vos interlocuteurs</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Destinataires */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <span className="text-sm text-gray-500 font-medium pt-1.5 w-20 shrink-0">À :</span>
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedRecipients.map(r => (
                  <span key={r.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                    {r.name}
                    <button onClick={() => removeRecipient(r.id)} className="hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={recipientSearch}
                  onChange={e => { setRecipientSearch(e.target.value); setShowRecipientList(true); }}
                  onFocus={() => setShowRecipientList(true)}
                  placeholder="Rechercher un destinataire..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                {showRecipientList && filteredRecipients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredRecipients.map(r => (
                      <button
                        key={r.id}
                        onClick={() => addRecipient(r)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-800">{r.name}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[r.kind] || roleColors.unknown}`}>
                          {roleLabels[r.kind] || roleLabels.unknown}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Objet */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 font-medium w-20 shrink-0">Objet :</span>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Objet du message"
              className="flex-1 text-sm border-0 focus:outline-none text-gray-800 placeholder-gray-400"
                />
                {sendError && (
                  <p className="text-xs text-red-600 mt-2">{sendError}</p>
                )}
              </div>
        </div>

        {/* Corps */}
        <div className="px-5 py-4">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Rédigez votre message ici..."
            rows={10}
            className="w-full text-sm border-0 focus:outline-none resize-none text-gray-800 placeholder-gray-400"
          />
        </div>

        {/* Barre d'actions */}
        <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {body.length} caractère{body.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleSend}
            disabled={isSending || !subject.trim() || !body.trim() || selectedRecipients.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {isSending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</>
            ) : (
              <><Send className="w-4 h-4" /> Envoyer</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewMessagePage;
