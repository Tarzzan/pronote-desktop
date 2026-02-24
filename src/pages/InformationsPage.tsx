import React, { useEffect, useState } from 'react';
import { Bell, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getClient } from '../lib/pronote/client';
import type { Information } from '../types/pronote';

const InformationsPage: React.FC = () => {
  const [informations, setInformations] = useState<Information[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const client = getClient();
      if (!client) return;
      setLoading(true);
      try {
        const data = await client.getInformations();
        setInformations(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const unread = informations.filter((i) => !i.read).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Informations & sondages</h1>
        <p className="text-gray-500 text-sm mt-1">
          {unread > 0 ? `${unread} information(s) non lue(s)` : 'Toutes les informations'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : informations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune information disponible</p>
        </div>
      ) : (
        <div className="space-y-3">
          {informations.map((info) => (
            <div
              key={info.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                !info.read ? 'border-orange-200' : 'border-gray-200'
              }`}
            >
              <button
                onClick={() => {
                  setExpandedId(expandedId === info.id ? null : info.id);
                  setInformations((prev) =>
                    prev.map((i) => (i.id === info.id ? { ...i, read: true } : i))
                  );
                }}
                className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!info.read ? 'bg-orange-500' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${!info.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {info.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">{info.author}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">
                          {format(info.date, 'd MMM yyyy', { locale: fr })}
                        </span>
                        {info.category && (
                          <>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              {info.category}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {expandedId === info.id
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  }
                </div>
              </button>

              {expandedId === info.id && info.content && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div
                    className="text-sm text-gray-700 mt-3 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: info.content }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InformationsPage;
