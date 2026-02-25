import React, { useEffect, useState } from 'react';
import { MessageSquare, Send, Plus, Search, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { getClient } from '../lib/pronote/client';
import type { Discussion, Message } from '../types/pronote';

const MessagingPage: React.FC = () => {
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [selected, setSelected] = useState<Discussion | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const client = getClient();
      if (!client) return;
      setLoading(true);
      try {
        const data = await client.getDiscussions();
        setDiscussions(data);
        if (data.length > 0) setSelected(data[0]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = discussions.filter((d) =>
    d.subject.toLowerCase().includes(search.toLowerCase()) ||
    d.creator.toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = discussions.filter((d) => d.unread).length;

  const handleSend = async () => {
    if (!reply.trim() || !selected) return;
    const client = getClient();
    if (!client) return;

    const messageContent = reply.trim();
    const ok = await client.replyDiscussion(selected.id, messageContent);
    if (!ok) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      author: 'Moi',
      content: messageContent,
      date: new Date(),
      seen: true,
    };
    setDiscussions((prev) =>
      prev.map((d) =>
        d.id === selected.id
          ? { ...d, messages: [...d.messages, newMessage] }
          : d
      )
    );
    setSelected((prev) =>
      prev ? { ...prev, messages: [...prev.messages, newMessage] } : null
    );
    setReply('');
  };

  const handleSelectDiscussion = (discussion: Discussion) => {
    setSelected(discussion);
    if (!discussion.unread) return;
    const client = getClient();
    if (!client) return;
    void client.markDiscussionStatus(discussion.id, 'read').then((ok) => {
      if (!ok) return;
      setDiscussions((prev) =>
        prev.map((item) => (item.id === discussion.id ? { ...item, unread: false } : item))
      );
      setSelected((prev) => (prev && prev.id === discussion.id ? { ...prev, unread: false } : prev));
    });
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messagerie</h1>
          <p className="text-gray-500 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} message(s) non lu(s)` : 'Toutes les discussions'}
          </p>
        </div>
        <button
          onClick={() => navigate('/messaging/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nouvelle discussion
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex min-h-0">
          {/* Liste des discussions */}
          <div className="w-80 border-r border-gray-200 flex flex-col flex-shrink-0">
            {/* Recherche */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Aucune discussion</div>
              ) : (
                filtered.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleSelectDiscussion(d)}
                    className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      selected?.id === d.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm truncate ${d.unread ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                          {d.subject}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{d.creator}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {format(d.date, 'd MMM', { locale: fr })}
                        </span>
                        {d.unread && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full" />
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Zone de conversation */}
          <div className="flex-1 flex flex-col min-w-0">
            {selected ? (
              <>
                {/* En-tête de la discussion */}
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-900">{selected.subject}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Créée par {selected.creator}
                    {selected.participants.length > 0 && ` · ${selected.participants.length} participant(s)`}
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selected.messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Aucun message</div>
                  ) : (
                    selected.messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))
                  )}
                </div>

                {/* Zone de réponse */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Écrire un message..."
                      rows={2}
                      className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!reply.trim()}
                      className="px-4 py-2 bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:bg-gray-200 disabled:text-gray-400 transition-colors self-end"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Entrée pour envoyer · Maj+Entrée pour saut de ligne</p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Sélectionnez une discussion</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isMe = message.author === 'Moi';
  return (
    <div className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
        <User className="w-4 h-4 text-blue-600" />
      </div>
      <div className={`max-w-lg ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-700">{message.author}</span>
          <span className="text-xs text-gray-400">
            {format(message.date, 'HH:mm · d MMM', { locale: fr })}
          </span>
        </div>
        <div className={`px-4 py-2.5 rounded-2xl text-sm ${
          isMe
            ? 'bg-blue-700 text-white rounded-tr-sm'
            : 'bg-gray-100 text-gray-900 rounded-tl-sm'
        }`}>
          {message.content}
        </div>
      </div>
    </div>
  );
};

export default MessagingPage;
