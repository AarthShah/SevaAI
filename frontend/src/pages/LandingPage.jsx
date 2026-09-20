import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Search, CheckCircle2, Clock, ShieldCheck, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage = () => {
  const { switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const launchDemo = async (preset) => {
    await switchDemoRole('citizen');
    navigate(`/report?demo=${preset}`);
  };

  return (
    <div className="space-y-20 pb-20">
      <section className="civic-hero relative pt-14 pb-20 sm:pt-20 sm:pb-24 border-b border-emerald-100 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-7">
            <div className="inline-flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-[0.14em]">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Municipal grievance redressal portal</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-950 leading-[1.04]">
              Report a civic issue.<br />
              <span className="text-emerald-700">Follow its resolution.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
              Submit a complaint about roads, waste, water, lighting, and other public services. Your request is registered, assigned to the appropriate department, and tracked through completion.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <Link
              to="/report"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base shadow-xl shadow-emerald-800/20 transition-all flex items-center justify-center gap-2.5 hover:-translate-y-0.5"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Submit a complaint</span>
            </Link>

            <Link
              to="/track"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white/80 hover:bg-white text-slate-800 font-bold text-base border border-slate-300 shadow-sm transition flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              <Search className="w-5 h-5 text-slate-400" />
              <span>Track a complaint</span>
            </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Simple online submission</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-600" /> Status notifications</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-blue-600" /> Department accountability</span>
            </div>
          </div>

          <div className="pt-10 max-w-2xl">
            <div className="bg-white/80 backdrop-blur rounded-2xl p-4 border border-white shadow-sm space-y-2.5">
              <span className="text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5">
                <span>View a sample complaint</span>
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => launchDemo('pothole')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition flex items-center gap-1"
                >
                  <span>Road damage</span>
                </button>
                <button
                  type="button"
                  onClick={() => launchDemo('garbage')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition flex items-center gap-1"
                >
                  <span>Waste collection</span>
                </button>
                <button
                  type="button"
                  onClick={() => launchDemo('streetlight')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition flex items-center gap-1"
                >
                  <span>Street lighting</span>
                </button>
                <button
                  type="button"
                  onClick={() => launchDemo('water')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition flex items-center gap-1"
                >
                  <span>Water supply</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900">
            How the service works
          </h2>
          <p className="text-sm text-slate-600">
            A clear process from submission to departmental action.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3 relative group hover:border-emerald-500 transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg">
              1
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-lg">
              Submit the details
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Add a description, supporting photograph, and location so the department can assess the issue accurately.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3 relative group hover:border-emerald-500 transition">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-lg">
              2
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-lg">
              The request is assessed
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The complaint is reviewed, classified, and forwarded to the appropriate municipal department for action.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3 relative group hover:border-emerald-500 transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-lg">
              3
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-lg">
              Monitor progress
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Use your docket number to review updates, assigned officers, and the current status of the resolution.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-100/80 rounded-3xl p-6 sm:p-8 space-y-4 border border-slate-200">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            <span>Frequently asked questions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-1">
              <strong className="text-slate-900 block text-sm">Is an account required?</strong>
              <p className="text-slate-500 leading-relaxed">
                No. You may submit a complaint as a guest and receive a docket number for future reference.
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-1">
              <strong className="text-slate-900 block text-sm">What happens after submission?</strong>
              <p className="text-slate-500 leading-relaxed">
                Your complaint is assigned to the responsible department. You can follow its status and receive updates as work progresses.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
