import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Construction, Trash2, Lightbulb, Droplets,
  AlertCircle, Bot
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { useAssistant, useAssistantContext } from '../context/AssistantContext';

// 7-Stage End-to-End Municipal Workflow Stages
const WORKFLOW_STAGES = [
  {
    step: '01',
    title: 'REPORT',
    desc: 'Upload a photo, voice note, or describe the civic issue.'
  },
  {
    step: '02',
    title: 'AI ANALYZES',
    desc: 'AI identifies the issue, estimates severity, and extracts relevant details.'
  },
  {
    step: '03',
    title: 'VERIFY',
    desc: 'Citizens review AI results before submitting the complaint.',
    badge: 'Human-in-the-loop'
  },
  {
    step: '04',
    title: 'ROUTE',
    desc: 'The system identifies the appropriate civic department and workflow.'
  },
  {
    step: '05',
    title: 'TRACK',
    desc: 'Follow complaint progress, status changes, and SLA milestones.'
  },
  {
    step: '06',
    title: 'ESCALATE',
    desc: 'Follow-up and escalation mechanisms help prevent complaints from being forgotten.'
  },
  {
    step: '07',
    title: 'RESOLVE',
    desc: 'Issue addressed and complaint lifecycle completed.'
  }
];

// Technical Pipeline for "See How the AI Works" (Assistant Context Flow)
const AI_CONTEXT_PIPELINE = [
  { step: '01', title: 'USER CONTEXT', desc: 'Identifies role (Citizen / Authority / Guest) and authenticated session identity.' },
  { step: '02', title: 'CURRENT PAGE / ROLE', desc: 'Captures active view (Report, Track, Dashboard) and active tab filters.' },
  { step: '03', title: 'CURRENT WORKFLOW STATE', desc: 'Inspects in-progress form inputs, selected complaint ID, or inspection notes.' },
  { step: '04', title: 'AUTHORIZED BACKEND DATA', desc: 'Backend fetches only records the user is authorized to inspect. Secure and policy-gated.' },
  { step: '05', title: 'ASSISTANT ENGINE', desc: 'Role-specialized prompt templates frame grounded, actionable guidance.' },
  { step: '06', title: 'CONTEXTUAL GUIDANCE', desc: 'Returns direct explanations, recommended next steps, and contextual quick actions.' }
];

// Behind-the-Scenes Pipeline for Technical Overview (AIML & Municipal Flow)
const BEHIND_THE_SCENES_PIPELINE = [
  { name: 'Citizen Input', desc: 'Image, audio waveform, or textual description' },
  { name: 'Computer Vision / NLP', desc: 'Object detection and natural language structuring' },
  { name: 'AI Classification', desc: 'Category matching across municipal taxonomies' },
  { name: 'Severity Assessment', desc: 'Public safety risk scoring and triage tiering' },
  { name: 'RAG / Department Routing', desc: 'Jurisdiction mapping to responsible civic division' },
  { name: 'Municipal Workflow', desc: 'Field crew queue allocation and work orders' },
  { name: 'SLA Monitoring', desc: 'Time-to-response and auto-escalation tracking' },
  { name: 'Contextual AI Assistant', desc: 'Advisory guidance grounded in live state' }
];

// Real Example Walkthrough: Pothole Report
const POTHOLE_EXAMPLE = [
  { step: '1', title: 'Citizen uploads image', desc: 'Photo captured at roadway site.' },
  { step: '2', title: 'AI identifies issue', desc: 'Detects road asphalt crater and estimates dimensions.' },
  { step: '3', title: 'Severity assessed', desc: 'Assessed as high urgency due to traffic corridor risk.' },
  { step: '4', title: 'Citizen verifies', desc: 'Citizen checks auto-filled location and confirms details.' },
  { step: '5', title: 'Department workflow', desc: 'Routed to Road Infrastructure maintenance team.' },
  { step: '6', title: 'Citizen tracks', desc: 'Follows progress online with assigned tracking code.' },
  { step: '7', title: 'Assistant guides', desc: 'Assistant explains status and current response stage.' },
  { step: '8', title: 'Resolution', desc: 'Asphalt repaired, evidence logged, and ticket closed.' }
];

const COMMON_ISSUES = [
  {
    title: 'Potholes',
    category: 'Road Infrastructure',
    icon: Construction,
    description: 'Road craters, surface cracks, and broken pavers.'
  },
  {
    title: 'Garbage',
    category: 'Waste Management',
    icon: Trash2,
    description: 'Overflowing bins, uncollected waste, and illegal dumping.'
  },
  {
    title: 'Streetlights',
    category: 'Street Lighting',
    icon: Lightbulb,
    description: 'Dark roadway fixtures, damaged poles, and flickering lamps.'
  },
  {
    title: 'Water leakage',
    category: 'Water Supply',
    icon: Droplets,
    description: 'Burst distribution mains and leaking valve junctions.'
  },
  {
    title: 'Drainage',
    category: 'Stormwater & Drainage',
    icon: AlertCircle,
    description: 'Blocked monsoon catch basins and overflowing manholes.'
  }
];

const NEIGHBORHOOD_GRIEVANCES_SAMPLE = [
  {
    id: 'CVS-2025-00123',
    issue: 'Pothole on main roadway',
    approximateArea: 'MG Road area',
    category: 'Road Infrastructure',
    reportedDate: 'Reported 2 days ago',
    status: 'In Progress'
  },
  {
    id: 'CVS-2025-00122',
    issue: 'Garbage accumulation',
    approximateArea: 'Market area',
    category: 'Waste Management',
    reportedDate: 'Reported 4 days ago',
    status: 'Resolved'
  },
  {
    id: 'CVS-2025-00121',
    issue: 'Streetlight not operating',
    approximateArea: 'Station Road',
    category: 'Street Lighting',
    reportedDate: 'Reported 6 days ago',
    status: 'Under Review'
  },
  {
    id: 'CVS-2025-00120',
    issue: 'Water supply line leak',
    approximateArea: 'Sector 4 residential zone',
    category: 'Water Supply',
    reportedDate: 'Reported 1 day ago',
    status: 'In Progress'
  },
  {
    id: 'CVS-2025-00119',
    issue: 'Blocked storm drainage',
    approximateArea: 'Civil Lines district',
    category: 'Stormwater & Drainage',
    reportedDate: 'Reported 3 days ago',
    status: 'Submitted'
  }
];

export const LandingPage = () => {
  // Register contextual assistant metadata for the landing page
  useAssistantContext({
    pageName: 'LandingPage',
    activeTab: 'overview'
  });

  const { openAssistant } = useAssistant();

  // State for progressive technical disclosure and example visibility
  const [showTechnicalView, setShowTechnicalView] = useState(false);
  const [activeTechTab, setActiveTechTab] = useState('assistant'); // 'assistant' | 'aiml'
  const [showPotholeExample, setShowPotholeExample] = useState(true);

  return (
    <div className="space-y-16 pb-16 bg-white">
      {/* Hero Section matching exact reference layout */}
      <section className="pt-8 pb-12 lg:pt-14 lg:pb-16 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Column: Heading & CTAs */}
            <div className="lg:col-span-6 space-y-5">
              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-bold tracking-tight text-slate-900 leading-[1.12]">
                Report civic issues.<br />
                Get them resolved.
              </h1>

              <p className="text-base text-slate-600 max-w-lg leading-relaxed">
                CivicSeva uses AI to understand your complaint, suggest the right department, and help you track it until resolution.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
                <Link
                  to="/report"
                  className="px-6 py-3 rounded-md bg-blue-800 hover:bg-blue-900 text-white font-medium text-sm text-center shadow-sm transition flex items-center justify-center gap-2"
                >
                  <span>Report an Issue</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/track"
                  className="px-6 py-3 rounded-md bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm text-center border border-slate-300 shadow-sm transition"
                >
                  Track Complaint
                </Link>
              </div>
            </div>

            {/* Right Column: Hero Image matching reference */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                <img
                  src="/civic_hall.jpg"
                  alt="City Hall Municipal Boulevard"
                  className="w-full h-80 sm:h-[380px] lg:h-[400px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* HOW CIVICSEVA WORKS — CLEAN NATIVE CIVIC WORKFLOW               */}
      {/* ================================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4" aria-labelledby="how-it-works-heading">
        {/* Section Header matching exact website pattern */}
        <div className="border-b border-slate-200 pb-3 mb-6">
          <h2 id="how-it-works-heading" className="text-xl font-bold text-slate-900">
            How CivicSeva Works
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            From a citizen's report to resolution. One connected civic workflow.
          </p>
        </div>

        {/* Desktop Connected Step Track */}
        <div className="hidden lg:flex items-center justify-between mb-4 px-1" aria-hidden="true">
          {WORKFLOW_STAGES.map((s, idx) => (
            <React.Fragment key={`timeline-${s.step}`}>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-slate-400 font-semibold">{s.step}</span>
                <span className="text-xs font-semibold text-slate-700">{s.title}</span>
              </div>
              {idx < WORKFLOW_STAGES.length - 1 && (
                <div className="flex-1 h-px bg-slate-200 mx-3" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 7 Workflow Cards matching existing card style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {WORKFLOW_STAGES.map((item) => (
            <div
              key={item.step}
              className="bg-white border border-slate-200 hover:border-blue-700 rounded-md p-4 space-y-2 transition flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-slate-400 group-hover:text-blue-800 transition">
                    {item.step}
                  </span>
                  {item.badge && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {item.badge}
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-900">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-500 leading-normal">
                  {item.desc}
                </p>
              </div>

              {item.badge && (
                <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 leading-snug">
                  AI assists with analysis; citizens confirm before submission.
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ============================================================ */}
        {/* CIVICSEVA ASSISTANT INTEGRATION (NATIVE CARD STYLE)           */}
        {/* ============================================================ */}
        <div className="mt-6 bg-white border border-slate-200 rounded-md p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-slate-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-900">
                  CivicSeva Assistant
                </h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  Contextual Guide
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                Your guide throughout the journey. Available at every step to explain what you're seeing and what to do next.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAssistant}
            aria-label="Open CivicSeva Assistant Guide"
            className="px-4 py-2 rounded-md bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs shadow-sm transition flex items-center justify-center gap-1.5 self-start sm:self-auto flex-shrink-0"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Open Assistant Guide</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* CITIZEN & AUTHORITY WORKFLOW                                 */}
        {/* ============================================================ */}
        <div className="mt-8">
          <div className="border-b border-slate-200 pb-3 mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Citizen & Authority Workflow
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Connecting citizen reports directly with municipal field operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Citizen Track */}
            <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-semibold text-xs text-slate-800 uppercase tracking-wide">
                  Citizen
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">Front-End</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-slate-400 font-medium">01</span>
                  <div>
                    <span className="font-medium text-slate-900">Report Issue:</span>
                    <span className="text-slate-500 ml-1">Upload a photo, voice note, or text description.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-slate-400 font-medium">02</span>
                  <div>
                    <span className="font-medium text-slate-900">Review AI Analysis:</span>
                    <span className="text-slate-500 ml-1">Inspect auto-detected category and estimated severity.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-slate-400 font-medium">03</span>
                  <div>
                    <span className="font-medium text-slate-900">Verify Details:</span>
                    <span className="text-slate-500 ml-1">Confirm and refine report specifics prior to lodgement.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-slate-400 font-medium">04</span>
                  <div>
                    <span className="font-medium text-slate-900">Track Complaint:</span>
                    <span className="text-slate-500 ml-1">Follow real-time status changes and SLA timelines.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Authority Track */}
            <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-semibold text-xs text-slate-800 uppercase tracking-wide">
                  Municipal Authority
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">Operations</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-slate-400 font-medium">01</span>
                  <div>
                    <span className="font-medium text-slate-900">Triage Complaints:</span>
                    <span className="text-slate-500 ml-1">Review intake queue ordered by urgency and impact.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-slate-400 font-medium">02</span>
                  <div>
                    <span className="font-medium text-slate-900">Review Priority:</span>
                    <span className="text-slate-500 ml-1">Assess safety risks and municipal response targets.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-slate-400 font-medium">03</span>
                  <div>
                    <span className="font-medium text-slate-900">Assign Workflow:</span>
                    <span className="text-slate-500 ml-1">Dispatch work orders to field maintenance crews.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-slate-400 font-medium">04</span>
                  <div>
                    <span className="font-medium text-slate-900">Resolve Issue:</span>
                    <span className="text-slate-500 ml-1">Verify remediation work and close the ticket.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-md py-2.5 px-4 text-center">
            <p className="text-xs text-slate-600 font-medium">
              Citizen report &rarr; Municipal action &rarr; Resolution
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* REAL EXAMPLE: POTHOLE REPORT WALKTHROUGH                     */}
        {/* ============================================================ */}
        <div className="mt-8 bg-white border border-slate-200 rounded-md p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Example: Pothole Report
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                How a road issue moves through the platform from intake to resolution.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPotholeExample(!showPotholeExample)}
              className="text-xs font-semibold text-blue-800 hover:text-blue-900 flex items-center gap-1"
              aria-expanded={showPotholeExample}
            >
              <span>{showPotholeExample ? 'Hide example' : 'View example'}</span>
              <ArrowRight className={`w-3.5 h-3.5 transition-transform ${showPotholeExample ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {showPotholeExample && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {POTHOLE_EXAMPLE.map((item) => (
                <div key={`pothole-step-${item.step}`} className="bg-slate-50 border border-slate-200/80 rounded-md p-3">
                  <span className="font-mono text-slate-400 font-medium text-[11px]">Step {item.step}</span>
                  <h4 className="font-medium text-slate-900 mt-0.5">{item.title}</h4>
                  <p className="text-slate-500 text-[11px] mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* HOW THE TECHNOLOGY WORKS (SECONDARY / COLLAPSIBLE)           */}
        {/* ============================================================ */}
        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                How the technology works
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of the multi-modal classification and contextual guidance architecture.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowTechnicalView(!showTechnicalView)}
              aria-expanded={showTechnicalView}
              className="text-xs font-semibold text-blue-800 hover:text-blue-900 flex items-center gap-1 self-start sm:self-auto"
            >
              <span>{showTechnicalView ? 'Hide technical overview' : 'See how the AI works'}</span>
              <ArrowRight className={`w-3.5 h-3.5 transition-transform ${showTechnicalView ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {showTechnicalView && (
            <div className="mt-4 bg-white border border-slate-200 rounded-md p-4 sm:p-5 space-y-5">
              {/* Tab Selector */}
              <div className="flex items-center gap-4 border-b border-slate-200 pb-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTechTab('assistant')}
                  className={`font-semibold pb-2 -mb-2.5 transition border-b-2 ${
                    activeTechTab === 'assistant'
                      ? 'border-blue-800 text-blue-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Contextual Assistant Architecture
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTechTab('aiml')}
                  className={`font-semibold pb-2 -mb-2.5 transition border-b-2 ${
                    activeTechTab === 'aiml'
                      ? 'border-blue-800 text-blue-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Civic AI & Municipal Processing Stack
                </button>
              </div>

              {/* Tab Content: Assistant Context Pipeline */}
              {activeTechTab === 'assistant' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The assistant combines the user's current role, page, workflow state, and authorized complaint context to provide relevant next-step guidance.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                    {AI_CONTEXT_PIPELINE.map((node) => (
                      <div key={node.step} className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs">
                        <span className="font-mono text-slate-400 font-medium text-[11px]">{node.step}</span>
                        <h5 className="font-semibold text-slate-900 mt-0.5 text-xs">{node.title}</h5>
                        <p className="text-slate-500 text-[11px] mt-1 leading-snug">{node.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">Security & authorization:</span> Backend authorization remains authoritative. Frontend context informs relevant UI guidance but never bypasses server-side role policies or complaint ownership checks.
                  </div>
                </div>
              )}

              {/* Tab Content: AIML Behind-the-Scenes Pipeline */}
              {activeTechTab === 'aiml' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Multi-modal intake processes images and text descriptions, classifies civic categories, estimates severity, and routes directly to the responsible municipal department queue.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {BEHIND_THE_SCENES_PIPELINE.map((item, idx) => (
                      <div key={item.name} className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs">
                        <span className="font-mono text-slate-400 font-medium text-[11px]">0{idx + 1}</span>
                        <h5 className="font-semibold text-slate-900 mt-0.5 text-xs">{item.name}</h5>
                        <p className="text-slate-500 text-[11px] mt-1 leading-snug">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Common Civic Issues */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="border-b border-slate-200 pb-3 mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            Common Civic Issues
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose a common defect category to initiate a fast report.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {COMMON_ISSUES.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                to={`/report?category=${encodeURIComponent(item.category)}`}
                className="bg-white border border-slate-200 hover:border-blue-700 rounded-md p-4 space-y-2 transition block group"
              >
                <div className="w-8 h-8 rounded bg-slate-100 group-hover:bg-blue-50 text-slate-700 group-hover:text-blue-800 flex items-center justify-center transition">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-900">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 leading-normal">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* My Neighborhood Grievances (List-based, no map) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                My Neighborhood Grievances
              </h2>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Sample neighborhood data
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              View reported civic issues in your neighborhood. Approximate areas are shown to preserve resident privacy.
            </p>
          </div>

          <Link
            to="/report"
            className="text-xs font-semibold text-blue-800 hover:text-blue-900 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Report a new issue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Issue</th>
                  <th className="px-5 py-3">Approximate Area</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Reported</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {NEIGHBORHOOD_GRIEVANCES_SAMPLE.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {row.issue}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {row.approximateArea}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {row.category}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {row.reportedDate}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
