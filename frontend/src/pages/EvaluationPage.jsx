import React, { useState, useEffect } from 'react';
import { Bot, CheckCircle2, RefreshCw, BarChart2, ShieldCheck, AlertCircle, Sparkles, Database } from 'lucide-react';
import { analyticsApi } from '../api/analyticsApi';

export const EvaluationPage = () => {
  const [evalData, setEvalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCaseTab, setActiveCaseTab] = useState('ALL');

  const runEvaluation = async () => {
    setLoading(true);
    try {
      const results = await analyticsApi.getEvaluation();
      setEvalData(results);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runEvaluation();
  }, []);

  const metrics = evalData?.overall_metrics;
  const perClass = evalData?.per_class_metrics || {};
  const cases = evalData?.cases || [];

  const filteredCases = cases.filter((c) => {
    if (activeCaseTab === 'MATCHES') return c.matches.issue && c.matches.department;
    if (activeCaseTab === 'MISMATCHES') return !c.matches.issue || !c.matches.department;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold mb-1">
            <Bot className="w-3.5 h-3.5" />
            <span>Quantitative Model Benchmarking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900">
            CivicSeva AI Agent Evaluation
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Empirical validation against a 25-case labeled civic dataset assessing accuracy, precision, recall, and grounding.
          </p>
        </div>

        <button
          onClick={runEvaluation}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 self-start sm:self-auto disabled:opacity-75"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Rerun Benchmark Test</span>
        </button>
      </div>

      {/* MANDATORY DISTINCTION BANNER */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md flex items-start sm:items-center gap-3">
        <Database className="w-6 h-6 text-purple-300 flex-shrink-0 mt-1 sm:mt-0" />
        <div className="text-xs leading-relaxed">
          <strong className="text-purple-300 block text-sm font-heading mb-0.5 uppercase tracking-wider">
            Clear Separation: Model Benchmark Evaluation vs. Live User Predictions
          </strong>
          The metrics below are derived exclusively from a rigorously controlled test suite of 25 labeled civic complaints. Live user submissions are processed in real-time with human-in-the-loop validation and are never conflated with offline benchmark scores.
        </div>
      </div>

      {loading || !evalData ? (
        <div className="p-16 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
          <span>Executing benchmark evaluation harness across 25 civic test cases...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Scorecards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="text-[11px] text-slate-500 font-semibold block">Issue Classification</span>
              <span className="text-2xl font-black font-heading text-emerald-600 block mt-1">
                {metrics.classification_accuracy}%
              </span>
              <span className="text-[10px] text-slate-400">Accuracy (n=25)</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="text-[11px] text-slate-500 font-semibold block">Dept Mapping</span>
              <span className="text-2xl font-black font-heading text-blue-600 block mt-1">
                {metrics.department_mapping_accuracy}%
              </span>
              <span className="text-[10px] text-slate-400">RAG Routing Acc.</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="text-[11px] text-slate-500 font-semibold block">Severity Calibration</span>
              <span className="text-2xl font-black font-heading text-amber-600 block mt-1">
                {metrics.severity_calibration_accuracy}%
              </span>
              <span className="text-[10px] text-slate-400">Risk Alignment</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="text-[11px] text-slate-500 font-semibold block">Workflow Execution</span>
              <span className="text-2xl font-black font-heading text-purple-600 block mt-1">
                {metrics.agent_workflow_completion_rate}%
              </span>
              <span className="text-[10px] text-slate-400">6-Stage Completion</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="text-[11px] text-slate-500 font-semibold block">Evidence Grounding</span>
              <span className="text-2xl font-black font-heading text-teal-600 block mt-1">
                {metrics.evidence_grounding_rate}%
              </span>
              <span className="text-[10px] text-slate-400">Verifiable RAG Citations</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="text-[11px] text-slate-500 font-semibold block">Macro F1 Score</span>
              <span className="text-2xl font-black font-heading text-slate-900 block mt-1">
                {metrics.macro_f1_score}
              </span>
              <span className="text-[10px] text-slate-400">Harmonic Balance</span>
            </div>
          </div>

          {/* Per-Class Precision, Recall, F1 Breakdown Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-600" />
                <span>Per-Class Classification Metrics (Precision, Recall, F1)</span>
              </h3>
              <span className="text-xs text-slate-400">25 Labeled Test Ground Truths</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Category Class</th>
                    <th className="px-5 py-3">Precision</th>
                    <th className="px-5 py-3">Recall</th>
                    <th className="px-5 py-3">F1-Score</th>
                    <th className="px-5 py-3">Sample Support (n)</th>
                    <th className="px-5 py-3">F1 Performance Visual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {Object.entries(perClass).map(([className, score]) => {
                    const f1Pct = Math.round(score.f1_score * 100);
                    return (
                      <tr key={className} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3.5 font-bold font-mono text-slate-900">
                          {className}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-700">
                          {(score.precision * 100).toFixed(1)}%
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-700">
                          {(score.recall * 100).toFixed(1)}%
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-purple-700">
                          {score.f1_score.toFixed(3)}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 font-mono">
                          {score.support}
                        </td>
                        <td className="px-5 py-3.5 w-48">
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full"
                              style={{ width: `${f1Pct}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Test Case Inspection Explorer */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading font-bold text-sm text-slate-900">
                  Benchmark Test Cases & Predictions Explorer
                </h3>
                <p className="text-xs text-slate-500">
                  Compare ground-truth expectations against autonomous multi-agent predictions.
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setActiveCaseTab('ALL')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${activeCaseTab === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                >
                  All ({cases.length})
                </button>
                <button
                  onClick={() => setActiveCaseTab('MATCHES')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${activeCaseTab === 'MATCHES' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}
                >
                  Correct Matches
                </button>
                <button
                  onClick={() => setActiveCaseTab('MISMATCHES')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${activeCaseTab === 'MISMATCHES' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600'}`}
                >
                  Edge Cases
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 divide-y divide-slate-100">
              {filteredCases.map((c) => (
                <div key={c.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-700">{c.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.matches.issue && c.matches.department
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {c.matches.issue && c.matches.department ? '✓ Full Match' : 'Partial Match'}
                    </span>
                  </div>

                  <p className="text-slate-800 font-medium italic">"{c.text}"</p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 font-semibold block">Expected Ground Truth:</span>
                      <span className="text-slate-700 font-bold">{c.expected.issue}</span> &bull; {c.expected.department} ({c.expected.severity})
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Agent Predicted:</span>
                      <span className="text-purple-700 font-bold">{c.predicted.issue}</span> &bull; {c.predicted.department} ({c.predicted.severity})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
