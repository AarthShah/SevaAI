import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Construction,
  Trash2,
  Lightbulb,
  Droplets,
  AlertCircle,
  AlertTriangle,
  Bot,
  Camera,
  Sparkles,
  CheckCircle2,
  GitBranch,
  Clock,
  CheckCheck,
  Building2,
  ChevronDown
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { useAssistant, useAssistantContext } from '../context/AssistantContext';

// 7-Stage End-to-End Municipal Workflow Stages
// Balanced Color Architecture: Primary Civic Blue for flow + targeted semantic accents (AI: Purple, Escalate: Amber, Resolve: Green)
const WORKFLOW_STAGES = [
  {
    step: '01',
    title: 'Report',
    desc: 'Citizen captures a photo, records a voice note, or enters a description with live GPS.',
    icon: Camera,
    numColor: 'text-blue-700',
    dot: 'bg-blue-600',
    iconBg: 'bg-blue-50 text-blue-700 group-hover:bg-blue-100',
    stepperBg: 'bg-blue-50 text-blue-700'
  },
  {
    step: '02',
    title: 'AI Analyzes',
    desc: 'Autonomous vision and NLP models classify defect categories and calculate risk severity.',
    icon: Sparkles,
    numColor: 'text-blue-700',
    dot: 'bg-blue-600',
    iconBg: 'bg-purple-50 text-purple-700 group-hover:bg-purple-100', // Targeted AI semantic accent
    stepperBg: 'bg-blue-50 text-blue-700'
  },
  {
    step: '03',
    title: 'Verify',
    desc: 'Citizens review AI predictions, edit details if necessary, and approve final lodgement.',
    badge: 'Human-in-the-loop',
    icon: CheckCircle2,
    numColor: 'text-blue-700',
    dot: 'bg-blue-600',
    iconBg: 'bg-blue-50 text-blue-700 group-hover:bg-blue-100',
    stepperBg: 'bg-blue-50 text-blue-700'
  },
  {
    step: '04',
    title: 'Route',
    desc: 'Grounded municipal knowledge base routes ticket to the exact responsible department queue.',
    icon: GitBranch,
    numColor: 'text-blue-700',
    dot: 'bg-blue-600',
    iconBg: 'bg-blue-50 text-blue-700 group-hover:bg-blue-100',
    stepperBg: 'bg-blue-50 text-blue-700'
  },
  {
    step: '05',
    title: 'Track',
    desc: 'Real-time status tracking, crew assignment updates, and SLA resolution clocks.',
    icon: Clock,
    numColor: 'text-blue-700',
    dot: 'bg-blue-600',
    iconBg: 'bg-blue-50 text-blue-700 group-hover:bg-blue-100',
    stepperBg: 'bg-blue-50 text-blue-700'
  },
  {
    step: '06',
    title: 'Escalate',
    desc: 'Proactive timers trigger automated follow-ups and supervisory alerts if deadlines lapse.',
    icon: AlertTriangle,
    numColor: 'text-amber-700', // Targeted warning semantic accent
    dot: 'bg-amber-500',
    iconBg: 'bg-amber-50 text-amber-700 group-hover:bg-amber-100',
    stepperBg: 'bg-amber-50 text-amber-700'
  },
  {
    step: '07',
    title: 'Resolve',
    desc: 'Field crew remediation verified on-site, audit proof cataloged, and docket closed.',
    icon: CheckCheck,
    numColor: 'text-emerald-700', // Targeted completion semantic accent
    dot: 'bg-emerald-600',
    iconBg: 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100',
    stepperBg: 'bg-emerald-50 text-emerald-700'
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
  { step: '1', title: 'Citizen uploads image', desc: 'Photo captured at roadway site with GPS pin.', icon: Camera, color: 'text-blue-700 bg-blue-50 border border-blue-200/70' },
  { step: '2', title: 'AI identifies issue', desc: 'Detects road asphalt crater and estimates dimensions.', icon: Sparkles, color: 'text-purple-700 bg-purple-50 border border-purple-200/70' },
  { step: '3', title: 'Severity assessed', desc: 'Assessed as high urgency due to arterial traffic risk.', icon: AlertTriangle, color: 'text-amber-700 bg-amber-50 border border-amber-200/70' },
  { step: '4', title: 'Citizen verifies', desc: 'Citizen checks auto-filled location and confirms details.', icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50 border border-emerald-200/70' },
  { step: '5', title: 'Department routed', desc: 'Mapped to Road Infrastructure maintenance division.', icon: Building2, color: 'text-blue-700 bg-blue-50 border border-blue-200/70' },
  { step: '6', title: 'Citizen tracks', desc: 'Follows progress online with assigned tracking code.', icon: Clock, color: 'text-blue-700 bg-blue-50 border border-blue-200/70' },
  { step: '7', title: 'Assistant guides', desc: 'Assistant explains status and current response stage.', icon: Bot, color: 'text-purple-700 bg-purple-50 border border-purple-200/70' },
  { step: '8', title: 'Resolution verified', desc: 'Asphalt repaired, photographic proof logged, ticket closed.', icon: CheckCheck, color: 'text-emerald-700 bg-emerald-50 border border-emerald-200/70' }
];

const COMMON_ISSUES = [
  {
    title: 'Potholes',
    category: 'Road Infrastructure',
    icon: Construction,
    description: 'Road craters, surface cracks, and broken pavers.',
    color: 'bg-amber-50 text-amber-700 group-hover:bg-amber-100 border border-amber-200/60'
  },
  {
    title: 'Garbage',
    category: 'Waste Management',
    icon: Trash2,
    description: 'Overflowing bins, uncollected waste, and illegal dumping.',
    color: 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 border border-emerald-200/60'
  },
  {
    title: 'Streetlights',
    category: 'Street Lighting',
    icon: Lightbulb,
    description: 'Dark roadway fixtures, damaged poles, and flickering lamps.',
    color: 'bg-yellow-50 text-yellow-700 group-hover:bg-yellow-100 border border-yellow-200/60'
  },
  {
    title: 'Water leakage',
    category: 'Water Supply',
    icon: Droplets,
    description: 'Burst distribution mains and leaking valve junctions.',
    color: 'bg-sky-50 text-sky-700 group-hover:bg-sky-100 border border-sky-200/60'
  },
  {
    title: 'Drainage',
    category: 'Stormwater & Drainage',
    icon: AlertCircle,
    description: 'Blocked monsoon catch basins and overflowing manholes.',
    color: 'bg-teal-50 text-teal-700 group-hover:bg-teal-100 border border-teal-200/60'
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
    <div className="bg-white">
      {/* ================================================================ */}
      {/* 1. HERO SECTION                                                  */}
      {/* ================================================================ */}
      <section className="pt-8 pb-12 lg:pt-14 lg:pb-16 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Column: Heading & CTAs */}
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Autonomous Civic Grievance Network</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-bold tracking-tight text-slate-900 leading-[1.12]">
                Report civic issues.<br />
                <span className="text-blue-800">Get them resolved.</span>
              </h1>

              <p className="text-base text-slate-600 max-w-lg leading-relaxed">
                Seva AI uses AI to understand your complaint, suggest the right department, and help you track it until resolution.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
                <Link
                  to="/report"
                  className="px-6 py-3 rounded-md bg-blue-800 hover:bg-blue-900 active:bg-blue-950 text-white font-medium text-sm text-center shadow-sm hover:shadow transition flex items-center justify-center gap-2"
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

            {/* Right Column: Hero Image */}
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
      {/* 2. HOW CIVICSEVA WORKS (TINTED SECTION FOR VISUAL RHYTHM)         */}
      {/* ================================================================ */}
      <section className="py-12 lg:py-16 bg-slate-50/70 border-b border-slate-200/80" aria-labelledby="how-it-works-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="border-b border-slate-200 pb-3 mb-8">
            <div className="flex items-center gap-2">
              <h2 id="how-it-works-heading" className="text-xl sm:text-2xl font-bold text-slate-900">
                How Seva AI Works
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                7-Stage Pipeline
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              From a citizen's report to resolution. One continuous civic workflow.
            </p>
          </div>

          {/* Desktop Stepper Visual Track (Unified Single-Color Line) */}
          <div className="hidden lg:flex items-center justify-between mb-8 px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-2xs" aria-hidden="true">
            {WORKFLOW_STAGES.map((s, idx) => (
              <React.Fragment key={`timeline-${s.step}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${s.stepperBg}`}>
                    {s.step}
                  </span>
                  <span className="text-xs font-bold text-slate-800">{s.title}</span>
                </div>
                {idx < WORKFLOW_STAGES.length - 1 && (
                  <div className="flex-1 h-0.5 bg-slate-200 mx-3 relative">
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">&gt;</span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Structured Two-Phase Workflow Cards (Unified Card Styling) */}
          <div className="space-y-6">
            {/* Phase 1: Citizen Intake & AI Verification (3 Cards) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Phase 1</span>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-semibold text-slate-700">Citizen Intake &amp; AI Verification</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {WORKFLOW_STAGES.slice(0, 3).map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.step}
                      className="bg-white border border-slate-200 hover:border-blue-600 rounded-lg p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold ${item.numColor}`}>
                              {item.step}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                          </div>
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${item.iconBg} transition-colors duration-200`}>
                            <Icon className="w-4 h-4" />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-900 transition-colors">
                              {item.title}
                            </h3>
                            {item.badge && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      {item.badge && (
                        <p className="text-[11px] text-slate-500 pt-2.5 mt-3 border-t border-slate-100 leading-snug">
                          AI assists with analysis; citizen confirms before submission.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connecting Transition Banner */}
            <div className="flex items-center justify-center py-1">
              <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-blue-200/90 text-blue-900 text-xs font-medium shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span>Verified Grievance Transitions to Municipal Action</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-700 rotate-90 md:rotate-0" />
              </div>
            </div>

            {/* Phase 2: Municipal Routing & Accountability (4 Cards) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Phase 2</span>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-semibold text-slate-700">Municipal Routing &amp; Accountability</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {WORKFLOW_STAGES.slice(3).map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.step}
                      className="bg-white border border-slate-200 hover:border-blue-600 rounded-lg p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold ${item.numColor}`}>
                              {item.step}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                          </div>
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${item.iconBg} transition-colors duration-200`}>
                            <Icon className="w-4 h-4" />
                          </div>
                        </div>

                        <div>
                          <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-900 transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CIVICSEVA CONTEXTUAL ASSISTANT (NATIVE CARD STYLE)            */}
          {/* ============================================================ */}
          <div className="mt-8 bg-white border border-slate-200 border-l-4 border-l-purple-600 rounded-lg p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <Bot className="w-5 h-5 text-purple-700" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    Seva AI Assistant
                  </h3>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    Contextual Guide
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  Your guide throughout the journey.
                </p>
                <p className="text-xs text-slate-500 italic max-w-xl leading-relaxed">
                  &ldquo;I&apos;m available at every step to explain what you&apos;re seeing and what to do next.&rdquo;
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openAssistant}
              aria-label="Open Seva AI Assistant Guide"
              className="px-4 py-2.5 rounded-md bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-medium text-xs shadow-sm hover:shadow transition flex items-center justify-center gap-2 self-start sm:self-auto flex-shrink-0"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Open Assistant Guide</span>
            </button>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 3. CITIZEN & AUTHORITY WORKFLOW                                  */}
      {/* ================================================================ */}
      <section className="py-12 lg:py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-slate-200 pb-3 mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Citizen &amp; Authority Workflow
              </h2>
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Two Sides of the Same Platform
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Seamlessly connecting citizen grievance reports directly with municipal field operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Citizen Track */}
            <div className="bg-white border border-slate-200 border-t-2 border-t-blue-700 rounded-lg p-5 sm:p-6 space-y-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Citizen Interface
                  </h3>
                </div>
                <span className="text-[11px] text-blue-700 font-mono font-medium px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                  Front-End
                </span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-blue-600 font-bold bg-blue-50 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[11px]">01</span>
                  <div>
                    <span className="font-bold text-slate-900">Report Issue:</span>
                    <span className="text-slate-600 ml-1">Upload a photo, voice recording, or text description with GPS coordinates.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-mono text-blue-600 font-bold bg-blue-50 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[11px]">02</span>
                  <div>
                    <span className="font-bold text-slate-900">Review AI Analysis:</span>
                    <span className="text-slate-600 ml-1">Inspect auto-detected category, suggested department, and estimated severity.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-mono text-blue-600 font-bold bg-blue-50 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[11px]">03</span>
                  <div>
                    <span className="font-bold text-slate-900">Verify Details:</span>
                    <span className="text-slate-600 ml-1">Confirm and refine report specifics prior to formal municipal registration.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-mono text-blue-600 font-bold bg-blue-50 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[11px]">04</span>
                  <div>
                    <span className="font-bold text-slate-900">Track Complaint:</span>
                    <span className="text-slate-600 ml-1">Follow real-time status progressions, work order assignments, and SLA resolution.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Authority Track */}
            <div className="bg-white border border-slate-200 border-t-2 border-t-slate-700 rounded-lg p-5 sm:p-6 space-y-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Municipal Authority
                  </h3>
                </div>
                <span className="text-[11px] text-slate-700 font-mono font-medium px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                  Field Operations
                </span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-slate-700 font-bold bg-slate-100 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[11px]">01</span>
                  <div>
                    <span className="font-bold text-slate-900">Triage Complaints:</span>
                    <span className="text-slate-600 ml-1">Review the centralized intake queue dynamically sorted by urgency and hazard level.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-mono text-slate-700 font-bold bg-slate-100 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[11px]">02</span>
                  <div>
                    <span className="font-bold text-slate-900">Review Priority:</span>
                    <span className="text-slate-600 ml-1">Assess safety risks, department capacity, and statutory response deadlines.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-mono text-slate-700 font-bold bg-slate-100 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[11px]">03</span>
                  <div>
                    <span className="font-bold text-slate-900">Assign Workflow:</span>
                    <span className="text-slate-600 ml-1">Dispatch localized work orders directly to field maintenance crews.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-mono text-slate-700 font-bold bg-slate-100 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[11px]">04</span>
                  <div>
                    <span className="font-bold text-slate-900">Resolve Issue:</span>
                    <span className="text-slate-600 ml-1">Verify remediation work with logged photo evidence and close the docket.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-center">
            <p className="text-xs text-slate-600 font-medium flex items-center justify-center gap-2 flex-wrap">
              <span className="text-blue-700 font-semibold">Citizen Report</span>
              <span className="text-slate-400">&rarr;</span>
              <span className="text-purple-700 font-semibold">AI Triage &amp; Grounding</span>
              <span className="text-slate-800 font-semibold">Municipal Dispatch</span>
              <span className="text-slate-400">&rarr;</span>
              <span className="text-emerald-700 font-semibold">Verified Resolution</span>
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 4. REAL EXAMPLE: POTHOLE REPORT (TINTED SECTION FOR RHYTHM)       */}
      {/* ================================================================ */}
      <section className="py-12 lg:py-16 bg-slate-50/70 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Example: Pothole Resolution Lifecycle
                  </h3>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    End-to-End Walkthrough
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  How a road surface issue moves through the platform from citizen intake to municipal resolution.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPotholeExample(!showPotholeExample)}
                className="text-xs font-semibold text-blue-800 hover:text-blue-900 flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-100 transition"
                aria-expanded={showPotholeExample}
              >
                <span>{showPotholeExample ? 'Hide example' : 'View example'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showPotholeExample ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showPotholeExample && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                {POTHOLE_EXAMPLE.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={`pothole-step-${item.step}`}
                      className="bg-slate-50/90 border border-slate-200 rounded-lg p-3.5 space-y-2 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-500 font-bold text-[11px]">Step {item.step}</span>
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${item.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs">{item.title}</h4>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* HOW THE TECHNOLOGY WORKS (SECONDARY / COLLAPSIBLE)           */}
          {/* ============================================================ */}
          <div className="mt-8 border-t border-slate-200/80 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  How the technology works
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Overview of the multi-modal classification, grounding, and contextual guidance architecture.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTechnicalView(!showTechnicalView)}
                aria-expanded={showTechnicalView}
                className="text-xs font-semibold text-blue-800 hover:text-blue-900 flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-md hover:bg-white border border-slate-200 shadow-2xs transition"
              >
                <span>{showTechnicalView ? 'Hide technical overview' : 'See how the AI works'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showTechnicalView ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showTechnicalView && (
              <div className="mt-5 bg-white border border-slate-200 rounded-lg p-5 sm:p-6 space-y-5 shadow-sm">
                {/* Tab Selector */}
                <div className="flex items-center gap-6 border-b border-slate-200 pb-2 text-xs">
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
                    Civic AI &amp; Municipal Processing Stack
                  </button>
                </div>

                {/* Tab Content: Assistant Context Pipeline */}
                {activeTechTab === 'assistant' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      The contextual assistant synthesizes user role, active page, workflow state, and authorized grievance records to generate grounded guidance.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                      {AI_CONTEXT_PIPELINE.map((node) => (
                        <div key={node.step} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                          <span className="font-mono text-blue-700 font-bold text-[11px]">{node.step}</span>
                          <h5 className="font-bold text-slate-900 text-xs">{node.title}</h5>
                          <p className="text-slate-600 text-[11px] leading-snug">{node.desc}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600">
                      <span className="font-bold text-slate-900">Security &amp; authorization:</span> Backend authorization remains authoritative. Frontend context informs relevant UI guidance but never bypasses server-side role policies or complaint ownership checks.
                    </div>
                  </div>
                )}

                {/* Tab Content: AIML Behind-the-Scenes Pipeline */}
                {activeTechTab === 'aiml' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Multimodal pipeline processes images and natural language, classifies civic categories, estimates safety risk, and assigns tickets to municipal divisions.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {BEHIND_THE_SCENES_PIPELINE.map((item, idx) => (
                        <div key={item.name} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs space-y-1">
                          <span className="font-mono text-blue-700 font-bold text-[11px]">0{idx + 1}</span>
                          <h5 className="font-bold text-slate-900 text-xs">{item.name}</h5>
                          <p className="text-slate-600 text-[11px] leading-snug">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 5. COMMON CIVIC ISSUES (WHITE SECTION)                           */}
      {/* ================================================================ */}
      <section className="py-12 lg:py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-slate-200 pb-3 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Common Civic Issues
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Choose a common municipal defect category to initiate a fast report.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {COMMON_ISSUES.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  to={`/report?category=${encodeURIComponent(item.category)}`}
                  className="bg-white border border-slate-200 hover:border-blue-600 rounded-lg p-4 space-y-3 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 block group"
                >
                  <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center transition-colors duration-200`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-900 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-normal mt-1">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 6. MY NEIGHBORHOOD GRIEVANCES (SLATE TINTED BACKGROUND)          */}
      {/* ================================================================ */}
      <section className="py-12 lg:py-16 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  My Neighborhood Grievances
                </h2>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  Sample neighborhood data
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                View reported civic issues in your neighborhood. Approximate areas are shown to preserve resident privacy.
              </p>
            </div>

            <Link
              to="/report"
              className="text-xs font-semibold text-blue-800 hover:text-blue-900 flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-md hover:bg-white border border-slate-200 shadow-2xs transition"
            >
              <span>Report a new issue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Issue</th>
                    <th className="px-5 py-3.5">Approximate Area</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Reported</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {NEIGHBORHOOD_GRIEVANCES_SAMPLE.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
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
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
