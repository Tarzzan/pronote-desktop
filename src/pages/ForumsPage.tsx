import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getClient } from '../lib/pronote/client';
import type { Discussion } from '../types/pronote';

const ForumsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [reply, setReply] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const client = getClient();
      if (!client) {
        if (!cancelled) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await client.getDiscussions();
        if (!cancelled) {
          setDiscussions(data);
          setSelectedId(data[0]?.id ?? null);
        }
      } catch (error) {
        console.error('[ForumsPage] Erreur:', error);
        if (!cancelled) setDiscussions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return discussions;
    return discussions.filter((d) => d.subject.toLowerCase().includes(q) || d.creator.toLowerCase().includes(q));
  }, [discussions, query]);

  const selected = useMemo(() => discussions.find((d) => d.id === selectedId) ?? null, [discussions, selectedId]);

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    const client = getClient();
    if (!client) return;
    const content = reply.trim();
    const ok = await client.replyDiscussion(selected.id, content);
    if (!ok) return;

    setDiscussions((prev) =>
      prev.map((d) =>
        d.id === selected.id
          ? {
              ...d,
              messages: [
                ...d.messages,
                {
                  id: `${Date.now()}`,
                  author: 'Moi',
                  content,
                  date: new Date(),
                  seen: true,
                },
              ],
            }
          : d
      )
    );
    setReply('');
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Forums pédagogiques</h1>
        <p className="text-sm text-gray-500 mt-1">Discussions thématiques basées sur la messagerie Pronote</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex min-h-0">
          <aside className="w-80 border-r border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-100">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrer les sujets..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={`w-full text-left p-3 border-b border-gray-50 ${selectedId === d.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="text-sm font-semibold text-gray-900 truncate">{d.subject}</div>
                  <div className="text-xs text-gray-500 mt-1">{d.creator}</div>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex-1 flex flex-col min-w-0">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Sélectionnez un sujet</p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h2 className="font-semibold text-gray-900">{selected.subject}</h2>
                  <p className="text-xs text-gray-500 mt-1">Créé par {selected.creator}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selected.messages.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun message.</p>
                  ) : (
                    selected.messages.map((message) => (
                      <article key={message.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-800">{message.author}</span>
                          <span className="text-xs text-gray-500">
                            {format(message.date, 'EEE d MMM • HH:mm', { locale: fr })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{message.content}</p>
                      </article>
                    ))
                  )}
                </div>

                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={2}
                      placeholder="Répondre au sujet..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none"
                    />
                    <button
                      onClick={sendReply}
                      disabled={!reply.trim()}
                      className="self-end px-3 py-2 bg-blue-700 text-white rounded-lg disabled:bg-gray-200"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default ForumsPage;
