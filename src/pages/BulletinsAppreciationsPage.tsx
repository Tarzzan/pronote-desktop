import React, { useMemo } from 'react';
import { Quote } from 'lucide-react';
import GradesAppreciationsPage from './GradesAppreciationsPage';

const BulletinsAppreciationsPage: React.FC = () => {
  const hint = useMemo(
    () =>
      'Cette section réutilise la génération d\'appréciations par matière pour préparer les commentaires du bulletin.',
    []
  );

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm inline-flex items-center gap-2">
        <Quote className="w-4 h-4" />
        {hint}
      </div>
      <GradesAppreciationsPage />
    </div>
  );
};

export default BulletinsAppreciationsPage;
