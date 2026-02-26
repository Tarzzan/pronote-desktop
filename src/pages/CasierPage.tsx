import React, { useEffect, useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { FolderOpen, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import { getClient } from '../lib/pronote/client';
import type { Homework } from '../types/pronote';

type LockerNote = {
  id: string;
  title: string;
  content: string;
};

const STORAGE_KEY = 'pronote_casier_notes_v1';

const CasierPage: React.FC = () => {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [notes, setNotes] = useState<LockerNote[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setNotes(JSON.parse(saved) as LockerNote[]);
    } catch {
      // ignore invalid storage
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

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
        const now = new Date();
        const data = await client.getHomework(addDays(now, -30), addDays(now, 60));
        if (!cancelled) setHomeworks(data);
      } catch (error) {
        console.error('[CasierPage] Erreur:', error);
        if (!cancelled) setHomeworks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const attachments = useMemo(() => {
    const files = homeworks.flatMap((h) => h.files || []);
    const unique = new Map<string, { name: string; url: string }>();
    for (const file of files) {
      unique.set(`${file.name}-${file.url}`, { name: file.name, url: file.url });
    }
    return Array.from(unique.values());
  }, [homeworks]);

  const addNote = () => {
    if (!title.trim() && !content.trim()) return;
    setNotes((prev) => [
      { id: `${Date.now()}`, title: title.trim() || 'Note sans titre', content: content.trim() },
      ...prev,
    ]);
    setTitle('');
    setContent('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Casier numérique</h1>
        <p className="text-sm text-gray-500 mt-1">Espace personnel: notes rapides et ressources issues du cahier de textes</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Créer une note</h2>
          <div className="space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contenu"
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
            <button
              onClick={addNote}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {notes.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune note enregistrée.</p>
            ) : (
              notes.map((note) => (
                <article key={note.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-gray-900 text-sm">{note.title}</div>
                    <button
                      onClick={() => setNotes((prev) => prev.filter((n) => n.id !== note.id))}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{note.content || '—'}</p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3 inline-flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-blue-600" />
            Ressources détectées
          </h2>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : attachments.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune pièce jointe remontée par l&apos;API sur la période.</p>
          ) : (
            <div className="space-y-2">
              {attachments.map((file) => (
                <a
                  key={`${file.name}-${file.url}`}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3 hover:bg-gray-100"
                >
                  <span className="text-sm text-gray-800 truncate pr-3">{file.name}</span>
                  <LinkIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CasierPage;
