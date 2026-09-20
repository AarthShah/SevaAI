import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Search, Sparkles, MapPin, Camera, CheckCircle2, Clock, ShieldCheck, ArrowRight, Zap, Building2, HelpCircle, Radio } from 'lucide-react';
import { AutonomousAgentWidget } from '../components/AutonomousAgentWidget';
import { useAuth } from '../context/AuthContext';

export const LandingPage = () => {
  const { switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const launchDemo = async (preset) => {
    await switchDemoRole('citizen');
    navigate(`/report?demo=${preset}`);
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Friendly Hero Banner */}
      <section className="relative pt-12 pb-16 bg-gradient-to-b from-emerald-50/80 via-white to-slate-50 border-b border-slate-200 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI-Powered Civic Care for Your Neighborhood</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Pothole, garbage, or dark streetlight? <br className="hidden sm:inline" />
            <span className="text-emerald-600">CivicSeva gets it fixed.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            No confusing paperwork or guessing which municipal office to call. Simply snap a photo or speak what's wrong. Our AI agent figures out the department, alerts the city team, and tracks it until it's repaired.
          </p>

          {/* Big Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/report"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2.5 hover:scale-[1.02]"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Report an Issue (Takes 1 Min)</span>
            </Link>

            <Link
              to="/track"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-base border border-slate-300 shadow-sm transition flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5 text-slate-400" />
              <span>Track Existing Complaint</span>
            </Link>
          </div>

          {/* Instant 1-Click Interactive Demo Card */}
          <div className="pt-6 max-w-xl mx-auto">
            <div className="bg-white/90 backdrop-blur rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5">
              <span className="text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 fill-current" />
                <span>Want to see how it works? Try an instant demo:</span>
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => launchDemo('pothole')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition flex items-center gap-1"
                >
                  <span>🚧 Road Pothole</span>
                </button>
                <button
                  type="button"
                  onClick={() => launchDemo('garbage')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition flex items-center gap-1"
                >
                  <span>🗑️ Garbage Pile</span>
                </button>
                <button
                  type="button"
                  onClick={() => launchDemo('streetlight')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition flex items-center gap-1"
                >
                  <span>💡 Dark Streetlight</span>
                </button>
                <button
                  type="button"
                  onClick={() => launchDemo('water')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition flex items-center gap-1"
                >
                  <span>🚰 Water Pipe Leak</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clear 3-Step Guide: How It Works */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900">
            How CivicSeva Works
          </h2>
          <p className="text-sm text-slate-600">
            Three simple steps from seeing a problem to getting it fixed by the city.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3 relative group hover:border-emerald-500 transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg">
              1
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-lg">
              Show or Tell Us
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload a quick phone picture, tap to speak what happened in plain words, or pinpoint the spot on the interactive map.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3 relative group hover:border-emerald-500 transition">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-lg">
              2
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-lg">
              AI Inspects & Routes
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Our AI verifies the photo, checks urgency, finds the exact responsible department (Road, Water, Electric, etc.), and writes the formal ticket.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3 relative group hover:border-emerald-500 transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-lg">
              3
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-lg">
              Track to Resolution
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              You stay in control. Review everything before submitting, watch the live timeline, and trigger automated reminders if work is delayed.
            </p>
          </div>
        </div>
      </section>

      {/* Autonomous Operations Live Center */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <AutonomousAgentWidget />
      </section>

      {/* Helpful FAQ / Reassurance */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-100/80 rounded-3xl p-6 sm:p-8 space-y-4 border border-slate-200">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            <span>Common Questions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-1">
              <strong className="text-slate-900 block text-sm">Do I need an account to report?</strong>
              <p className="text-slate-500 leading-relaxed">
                No! You can report immediately as a citizen guest and receive an instant Docket ID (e.g. #CS1001) to track anytime.
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-1">
              <strong className="text-slate-900 block text-sm">Can I review what AI generates?</strong>
              <p className="text-slate-500 leading-relaxed">
                Always! The AI only prepares a draft. You review the department, severity, and text with final approval before anything is sent.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
