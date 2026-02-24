import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, BookOpen, BarChart2, ChevronRight, RotateCcw } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  options: string[];
  correct: number;
  explanation?: string;
}

interface QCMData {
  id: string;
  title: string;
  subject: string;
  duration: number; // minutes
  questions: Question[];
  status: 'available' | 'completed' | 'in_progress';
  score?: number;
}

const DEMO_QCMS: QCMData[] = [
  {
    id: '1',
    title: 'QCM — Fonctions affines',
    subject: 'Mathématiques',
    duration: 15,
    status: 'available',
    questions: [
      {
        id: 'q1',
        text: 'Quelle est la forme générale d\'une fonction affine ?',
        options: ['f(x) = ax²+ b', 'f(x) = ax + b', 'f(x) = a/x + b', 'f(x) = √x + b'],
        correct: 1,
        explanation: 'Une fonction affine est de la forme f(x) = ax + b, où a est le coefficient directeur et b l\'ordonnée à l\'origine.',
      },
      {
        id: 'q2',
        text: 'Si f(x) = 2x + 3, quelle est la valeur de f(5) ?',
        options: ['10', '13', '8', '15'],
        correct: 1,
        explanation: 'f(5) = 2 × 5 + 3 = 10 + 3 = 13',
      },
      {
        id: 'q3',
        text: 'Une fonction affine avec a = 0 est appelée :',
        options: ['Fonction linéaire', 'Fonction constante', 'Fonction quadratique', 'Fonction inverse'],
        correct: 1,
        explanation: 'Quand a = 0, f(x) = b est une constante. La courbe est une droite horizontale.',
      },
      {
        id: 'q4',
        text: 'Le coefficient directeur d\'une fonction affine représente :',
        options: ['L\'ordonnée à l\'origine', 'La pente de la droite', 'L\'abscisse à l\'origine', 'La valeur maximale'],
        correct: 1,
        explanation: 'Le coefficient directeur a représente la pente (inclinaison) de la droite.',
      },
    ],
  },
  {
    id: '2',
    title: 'QCM — La Révolution française',
    subject: 'Histoire',
    duration: 20,
    status: 'completed',
    score: 75,
    questions: [
      {
        id: 'q1',
        text: 'En quelle année a débuté la Révolution française ?',
        options: ['1776', '1789', '1792', '1799'],
        correct: 1,
        explanation: 'La Révolution française a débuté en 1789 avec la prise de la Bastille le 14 juillet.',
      },
    ],
  },
  {
    id: '3',
    title: 'QCM — Conjugaison : le passé composé',
    subject: 'Français',
    duration: 10,
    status: 'available',
    questions: [
      {
        id: 'q1',
        text: 'Quel auxiliaire utilise-t-on pour conjuguer "aller" au passé composé ?',
        options: ['Avoir', 'Être', 'Les deux', 'Aucun des deux'],
        correct: 1,
        explanation: 'Le verbe "aller" se conjugue avec l\'auxiliaire "être" : je suis allé(e).',
      },
      {
        id: 'q2',
        text: 'Quelle est la forme correcte du passé composé de "finir" à la 1ère personne du singulier ?',
        options: ['J\'ai fini', 'Je suis fini', 'J\'ai finit', 'Je finis'],
        correct: 0,
        explanation: '"Finir" se conjugue avec "avoir". Le participe passé de "finir" est "fini" (sans t).',
      },
    ],
  },
];

type GameState = 'list' | 'playing' | 'result';

const QCMPage: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('list');
  const [activeQCM, setActiveQCM] = useState<QCMData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const startQCM = (qcm: QCMData) => {
    setActiveQCM(qcm);
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setGameState('playing');
  };

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (selectedAnswer === null || !activeQCM) return;
    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);
    if (currentQuestion + 1 >= activeQCM.questions.length) {
      setGameState('result');
    } else {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const getScore = () => {
    if (!activeQCM) return 0;
    const correct = answers.filter((a, i) => a === activeQCM.questions[i].correct).length;
    return Math.round((correct / activeQCM.questions.length) * 100);
  };

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      'Mathématiques': 'bg-blue-100 text-blue-700',
      'Histoire': 'bg-amber-100 text-amber-700',
      'Français': 'bg-purple-100 text-purple-700',
    };
    return colors[subject] || 'bg-gray-100 text-gray-700';
  };

  // ── Vue : liste des QCM ───────────────────────────────────────────────────

  if (gameState === 'list') {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🧠 <span>Mes QCM</span>
          </h1>
          <p className="text-gray-500 mt-1">Exercices interactifs et évaluations en ligne</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEMO_QCMS.map((qcm, i) => (
            <motion.div
              key={qcm.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getSubjectColor(qcm.subject)}`}>
                    📚 {qcm.subject}
                  </span>
                  {qcm.status === 'completed' && (
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      ✅ {qcm.score}%
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-3">{qcm.title}</h3>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {qcm.questions.length} questions</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {qcm.duration} min</span>
                </div>
                {qcm.status === 'completed' ? (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                        style={{ width: `${qcm.score}%` }}
                      />
                    </div>
                    <button
                      onClick={() => startQCM(qcm)}
                      className="w-full text-xs text-gray-500 hover:text-blue-600 flex items-center justify-center gap-1 py-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Recommencer
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startQCM(qcm)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    Commencer <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // ── Vue : en cours ────────────────────────────────────────────────────────

  if (gameState === 'playing' && activeQCM) {
    const question = activeQCM.questions[currentQuestion];
    const progress = ((currentQuestion) / activeQCM.questions.length) * 100;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Barre de progression */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">
              Question {currentQuestion + 1} / {activeQCM.questions.length}
            </span>
            <span className="text-sm font-semibold text-blue-600">{activeQCM.title}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-6">
            <motion.div
              className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* Question */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
            <p className="text-lg font-semibold text-gray-900 leading-relaxed">
              🤔 {question.text}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, i) => {
              let style = 'bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50';
              if (selectedAnswer !== null) {
                if (i === question.correct) style = 'bg-green-50 border-green-500 text-green-800';
                else if (i === selectedAnswer) style = 'bg-red-50 border-red-400 text-red-700';
                else style = 'bg-gray-50 border-gray-200 text-gray-400';
              }
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => handleAnswer(i)}
                  disabled={selectedAnswer !== null}
                  className={`w-full text-left px-5 py-3.5 rounded-xl border-2 transition-all duration-200 font-medium text-sm flex items-center gap-3 ${style} ${selectedAnswer === null ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {option}
                  {selectedAnswer !== null && i === question.correct && <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />}
                  {selectedAnswer !== null && i === selectedAnswer && i !== question.correct && <XCircle className="w-5 h-5 text-red-500 ml-auto" />}
                </motion.button>
              );
            })}
          </div>

          {/* Explication */}
          <AnimatePresence>
            {showExplanation && question.explanation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 p-4 rounded-xl border-l-4 text-sm ${selectedAnswer === question.correct ? 'bg-green-50 border-green-500 text-green-800' : 'bg-orange-50 border-orange-400 text-orange-800'}`}
              >
                <p className="font-semibold mb-1">{selectedAnswer === question.correct ? '✅ Bonne réponse !' : '❌ Pas tout à fait...'}</p>
                <p>💡 {question.explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {selectedAnswer !== null && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={nextQuestion}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {currentQuestion + 1 >= activeQCM.questions.length ? '🏁 Voir les résultats' : 'Question suivante'} <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </motion.div>
      </div>
    );
  }

  // ── Vue : résultats ───────────────────────────────────────────────────────

  if (gameState === 'result' && activeQCM) {
    const score = getScore();
    const correct = answers.filter((a, i) => a === activeQCM.questions[i].correct).length;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="text-6xl mb-4">{score >= 80 ? '🏆' : score >= 60 ? '🎯' : score >= 40 ? '💪' : '📚'}</div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">{score}%</h2>
          <p className="text-gray-500">{correct} bonne(s) réponse(s) sur {activeQCM.questions.length}</p>

          <div className="w-full bg-gray-100 rounded-full h-4 my-6">
            <motion.div
              className={`h-4 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-blue-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>

          <p className="text-gray-600 font-medium">
            {score >= 80 ? '🌟 Excellent ! Maîtrise parfaite du sujet.' : score >= 60 ? '👍 Bon travail ! Quelques points à revoir.' : score >= 40 ? '💡 Des lacunes à combler. Revoyez le cours.' : '📖 Il faut retravailler ce chapitre.'}
          </p>
        </motion.div>

        {/* Récapitulatif des réponses */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">📋 Récapitulatif</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {activeQCM.questions.map((q, i) => (
              <div key={q.id} className="px-5 py-3 flex items-start gap-3">
                {answers[i] === q.correct
                  ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{q.text}</p>
                  {answers[i] !== q.correct && (
                    <p className="text-xs text-green-600 mt-1">✅ Bonne réponse : {q.options[q.correct]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => startQCM(activeQCM)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Recommencer
          </button>
          <button
            onClick={() => setGameState('list')}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
          >
            ← Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default QCMPage;
