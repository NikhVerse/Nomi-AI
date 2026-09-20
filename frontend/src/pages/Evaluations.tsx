import React, { useState, useEffect } from 'react';
import type { Persona, Evaluation } from '../types';
import { apiRequest } from '../lib/api';
import {
  Sparkles,
  Bot,
  Play,
  AlertCircle,
  Loader2,
  ChevronRight,
  Info
} from 'lucide-react';

const PREDEFINED_TEST_CASES = [
  'Explain machine learning to a beginner.',
  'Give me a practical 30-day AI learning plan.',
  'Explain a difficult technical topic using simple language.',
  'What are your top 3 recommendations for building software projects?',
];

interface EvaluationsProps {
  initialPersonaId?: string;
  onNavigateToBuilder: () => void;
}

export const Evaluations: React.FC<EvaluationsProps> = ({
  initialPersonaId,
  onNavigateToBuilder,
}) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedTestCase, setSelectedTestCase] = useState<string>(PREDEFINED_TEST_CASES[0]);
  const [customTestCase, setCustomTestCase] = useState<string>('');
  
  const [running, setRunning] = useState(false);
  const [latestResult, setLatestResult] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load personas
  useEffect(() => {
    apiRequest<Persona[]>('/personas').then((data) => {
      setPersonas(data);
      if (data.length > 0) {
        const found = initialPersonaId
          ? data.find((p) => p.id === initialPersonaId) || data[0]
          : data[0];
        setSelectedPersona(found);
      }
    });
  }, [initialPersonaId]);

  // Load evaluations history when persona changes
  useEffect(() => {
    if (!selectedPersona) return;
    apiRequest<Evaluation[]>(`/evaluations/${selectedPersona.id}`)
      .then((history) => {
        setEvaluations(history);
        if (history.length > 0) {
          setLatestResult(history[0]);
        } else {
          setLatestResult(null);
        }
      })
      .catch((err) => console.error(err));
  }, [selectedPersona]);

  const handleRunEvaluation = async () => {
    if (!selectedPersona) return;
    const testPrompt = customTestCase.trim() || selectedTestCase;
    if (!testPrompt) return;

    setRunning(true);
    setError(null);

    try {
      const res = await apiRequest<Evaluation>('/evaluations', {
        method: 'POST',
        body: JSON.stringify({
          persona_id: selectedPersona.id,
          test_case: testPrompt,
        }),
      });
      setLatestResult(res);
      setEvaluations((prev) => [res, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Evaluation failed. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  const renderScoreBar = (score: number, max = 5) => {
    const percentage = Math.min(100, Math.max(0, (score / max) * 100));
    return (
      <div className="flex items-center space-x-3">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              score >= 4 ? 'bg-emerald-500' : score >= 3 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-800 w-10 text-right">
          {score.toFixed(1)}/{max}
        </span>
      </div>
    );
  };

  if (personas.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto mt-12">
        <Bot className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-slate-900 mb-1">No Personas Found</h2>
        <p className="text-sm text-slate-500 mb-5">
          Create a persona first to run standardized behavioral evaluations.
        </p>
        <button
          onClick={onNavigateToBuilder}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg"
        >
          <span>Create Persona</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-2.5 mb-1">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Persona Evaluation
          </h1>
        </div>
        <p className="text-sm text-slate-500">
          Demonstrate and verify how well the AI persona adheres to its system prompt instructions, tone, and guardrails.
        </p>
      </div>

      {/* Methodology notice */}
      <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-xl flex items-start space-x-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold text-slate-900">Transparent Rubric Methodology: </span>
          Evaluations score across 5 objective dimensions (Instruction Adherence, Persona Consistency, Tone, Relevance, and Preference Compliance) on a 1.0 - 5.0 scale using an AI-assisted evaluation judge.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Test Runner (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Persona
            </label>
            <select
              id="evaluation-persona-select"
              value={selectedPersona?.id || ''}
              onChange={(e) => {
                const found = personas.find((p) => p.id === e.target.value);
                if (found) setSelectedPersona(found);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Predefined Test Cases
            </label>
            <div className="space-y-2">
              {PREDEFINED_TEST_CASES.map((tc, idx) => (
                <label
                  key={idx}
                  className={`flex items-start space-x-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    selectedTestCase === tc && !customTestCase
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-medium'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="testcase"
                    checked={selectedTestCase === tc && !customTestCase}
                    onChange={() => {
                      setSelectedTestCase(tc);
                      setCustomTestCase('');
                    }}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{tc}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Or Custom Test Case
            </label>
            <textarea
              rows={2}
              value={customTestCase}
              onChange={(e) => setCustomTestCase(e.target.value)}
              placeholder="Type your own custom test prompt..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            id="run-evaluation-btn"
            onClick={handleRunEvaluation}
            disabled={running}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-xs disabled:opacity-60 transition-colors"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Evaluation...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Evaluation</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Score Card & Results (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {latestResult ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
                    Evaluation Result
                  </span>
                  <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                    "{latestResult.test_case}"
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">
                    {new Date(latestResult.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* 5 Dimension Score Cards */}
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>Instruction Adherence</span>
                  </div>
                  {renderScoreBar(latestResult.instruction_adherence)}
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>Persona Consistency</span>
                  </div>
                  {renderScoreBar(latestResult.persona_consistency)}
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>Tone Consistency</span>
                  </div>
                  {renderScoreBar(latestResult.tone_consistency)}
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>Relevance</span>
                  </div>
                  {renderScoreBar(latestResult.relevance)}
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>Preference Compliance</span>
                  </div>
                  {renderScoreBar(latestResult.preference_compliance)}
                </div>
              </div>

              {/* Evaluator Feedback */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                  Feedback & Critique
                </h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {latestResult.feedback}
                </div>
              </div>

              {/* Persona Response Accordion/View */}
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                  Persona's Generated Response
                </h4>
                <div className="p-3.5 bg-slate-900 text-slate-100 rounded-lg text-xs leading-relaxed font-mono whitespace-pre-wrap border border-slate-800">
                  {latestResult.response}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2 stroke-1" />
              <p className="text-sm font-medium text-slate-700">No evaluation selected</p>
              <p className="text-xs text-slate-400 mt-1">
                Choose a test case and click "Run Evaluation" to grade persona adherence.
              </p>
            </div>
          )}

          {/* Past Evaluations Table/List */}
          {evaluations.length > 1 && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
                Evaluation History ({evaluations.length} runs)
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {evaluations.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => setLatestResult(ev)}
                    className={`w-full text-left p-3 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      latestResult?.id === ev.id
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="truncate mr-3">
                      <span className="font-semibold block truncate">{ev.test_case}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(ev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
