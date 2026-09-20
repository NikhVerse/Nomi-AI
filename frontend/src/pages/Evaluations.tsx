import React, { useState, useEffect } from 'react';
import type { Persona, Evaluation } from '../types';
import { apiRequest } from '../lib/api';
import {
  Sparkles,
  Bot,
  Play,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Volume2,
  Target,
  Sliders,
  FileText,
  PenTool,
  Award
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

  const getOverallScore = (ev: Evaluation) => {
    return (
      (ev.instruction_adherence +
        ev.persona_consistency +
        ev.tone_consistency +
        ev.relevance +
        ev.preference_compliance) /
      5
    );
  };

  const getScoreVerdict = (score: number) => {
    if (score >= 4.5) return { label: 'Outstanding Match', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (score >= 4.0) return { label: 'Strong Adherence', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (score >= 3.0) return { label: 'Acceptable Alignment', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Needs Refinement', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  const renderMetricBar = (score: number, max = 5) => {
    const percentage = Math.min(100, Math.max(0, (score / max) * 100));
    return (
      <div className="flex items-center space-x-2.5 flex-1">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              score >= 4.2 ? 'bg-emerald-500' : score >= 3.5 ? 'bg-indigo-500' : 'bg-amber-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-800 w-8 text-right font-mono">
          {score.toFixed(1)}
        </span>
      </div>
    );
  };

  if (personas.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-md mx-auto mt-12">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <Bot className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-slate-900 mb-1">No Personas Found</h2>
        <p className="text-xs text-slate-500 mb-5">
          Create a persona first to run behavioral evaluations.
        </p>
        <button
          onClick={onNavigateToBuilder}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <span>Create Persona</span>
        </button>
      </div>
    );
  }

  const overallScore = latestResult ? getOverallScore(latestResult) : 0;
  const verdict = latestResult ? getScoreVerdict(overallScore) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Evaluations
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Automated prompt adherence & 5-metric rubric benchmarks
          </p>
        </div>

        {/* 5-Metric Quick Pills */}
        <div className="flex items-center flex-wrap gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Adherence</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium text-slate-600">
            <Bot className="w-3.5 h-3.5 text-indigo-600" />
            <span>Persona</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium text-slate-600">
            <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tone</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium text-slate-600">
            <Target className="w-3.5 h-3.5 text-indigo-600" />
            <span>Relevance</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium text-slate-600">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>Rules</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Test Configuration (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                <Bot className="w-3.5 h-3.5 text-slate-400" />
                <span>Persona</span>
              </label>
              <select
                id="evaluation-persona-select"
                value={selectedPersona?.id || ''}
                onChange={(e) => {
                  const found = personas.find((p) => p.id === e.target.value);
                  if (found) setSelectedPersona(found);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Test Cases</span>
              </label>
              <div className="space-y-1.5">
                {PREDEFINED_TEST_CASES.map((tc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedTestCase(tc);
                      setCustomTestCase('');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-start space-x-2 ${
                      selectedTestCase === tc && !customTestCase
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-medium shadow-2xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span>{tc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <PenTool className="w-3.5 h-3.5 text-slate-400" />
                <span>Custom Query</span>
              </label>
              <textarea
                rows={2}
                value={customTestCase}
                onChange={(e) => setCustomTestCase(e.target.value)}
                placeholder="Type custom test prompt..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="run-evaluation-btn"
              onClick={handleRunEvaluation}
              disabled={running}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-60 transition-colors"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Evaluation</span>
                </>
              )}
            </button>
          </div>

          {/* Past History */}
          {evaluations.length > 1 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2.5">
                History ({evaluations.length})
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {evaluations.map((ev) => {
                  const evScore = getOverallScore(ev);
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setLatestResult(ev)}
                      className={`w-full text-left p-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                        latestResult?.id === ev.id
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-medium'
                          : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="truncate mr-2">{ev.test_case}</span>
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                        {evScore.toFixed(1)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Clear Page Results (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {latestResult && verdict ? (
            <>
              {/* Overall Score Hero Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Evaluated Test Query
                  </span>
                  <h2 className="text-base font-semibold text-slate-900">
                    "{latestResult.test_case}"
                  </h2>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <div className="text-2xl font-black tracking-tight text-slate-900 font-mono">
                      {overallScore.toFixed(1)}
                      <span className="text-xs font-normal text-slate-400">/5.0</span>
                    </div>
                    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${verdict.color}`}>
                      {verdict.label}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* 5-Metric Breakdown Grid */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-2">
                  Metric Breakdown
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                      <span className="flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Instruction Adherence</span>
                      </span>
                    </div>
                    {renderMetricBar(latestResult.instruction_adherence)}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                      <span className="flex items-center space-x-1.5">
                        <Bot className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Persona Consistency</span>
                      </span>
                    </div>
                    {renderMetricBar(latestResult.persona_consistency)}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                      <span className="flex items-center space-x-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Tone Consistency</span>
                      </span>
                    </div>
                    {renderMetricBar(latestResult.tone_consistency)}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                      <span className="flex items-center space-x-1.5">
                        <Target className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Relevance</span>
                      </span>
                    </div>
                    {renderMetricBar(latestResult.relevance)}
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                      <span className="flex items-center space-x-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Rule & Preference Compliance</span>
                      </span>
                    </div>
                    {renderMetricBar(latestResult.preference_compliance)}
                  </div>
                </div>
              </div>

              {/* Feedback Critique Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Evaluator Critique</span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {latestResult.feedback}
                </div>
              </div>

              {/* Persona Generated Response Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Bot className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Persona Output</span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200/80 text-slate-800 rounded-xl text-xs leading-relaxed whitespace-pre-wrap">
                  {latestResult.response}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-indigo-400 stroke-1" />
              <p className="text-sm font-semibold text-slate-700">No evaluation selected</p>
              <p className="text-xs text-slate-400 mt-1">
                Select a test case and click "Run Evaluation" to benchmark adherence.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
