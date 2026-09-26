import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Search, CheckCircle2, ListChecks, Construction, Trash2, Lightbulb, Droplets, AlertCircle } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Report',
    desc: 'Upload a photo, speak or type your issue.',
    icon: FileText
  },
  {
    step: '02',
    title: 'AI Analysis',
    desc: 'We identify the issue and suggest the right department.',
    icon: Search
  },
  {
    step: '03',
    title: 'Review & Submit',
    desc: 'Check the details and confirm before submitting.',
    icon: CheckCircle2
  },
  {
    step: '04',
    title: 'Track',
    desc: 'Follow the status of your complaint in real time.',
    icon: ListChecks
  }
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

      {/* How It Works Section matching exact reference design */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">
            How It Works
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {HOW_IT_WORKS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="flex items-start gap-3.5">
                {/* Clean square light-blue icon box */}
                <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700">
                  <Icon className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 font-medium">{item.step}</span>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
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
