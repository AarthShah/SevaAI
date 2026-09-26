import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, FileSearch, CheckSquare, Clock, ArrowRight, AlertCircle, Droplets, Lightbulb, Trash2, Construction } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

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

export const LandingPage = () => {
  return (
    <div className="space-y-16 pb-16">
      {/* Short, Dignified Civic Hero */}
      <section className="bg-slate-50 border-b border-slate-200 py-12 lg:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded">
                  Municipal Digital Service
                </span>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                  Report civic issues.<br />
                  Track them to resolution.
                </h1>
                <p className="text-base text-slate-600 max-w-xl leading-relaxed">
                  CivicSeva helps residents report local issues, identify the appropriate department, and track their complaints from submission to resolution.
                </p>
              </div>

              {/* Functional Rectangular CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  to="/report"
                  className="px-6 py-3 rounded bg-blue-800 hover:bg-blue-900 text-white font-medium text-sm text-center shadow-sm transition"
                >
                  Report an Issue
                </Link>

                <Link
                  to="/track"
                  className="px-6 py-3 rounded bg-white hover:bg-slate-50 text-slate-800 font-medium text-sm text-center border border-slate-300 shadow-sm transition"
                >
                  Track Complaint
                </Link>
              </div>
            </div>

            {/* Right Civic Imagery */}
            <div className="lg:col-span-5">
              <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                <img
                  src="/civic_hall.jpg"
                  alt="Municipal Administration City Hall"
                  className="w-full h-64 sm:h-72 object-cover"
                />
                <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                  <span>Municipal Operations Administration</span>
                  <span className="text-[11px] font-mono text-slate-400">Direct Departmental Triage</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How CivicSeva Works (4 Simple Steps) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-200 pb-4 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            How CivicSeva works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            A structured four-step process connecting residents with municipal services.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 01 */}
          <div className="bg-white border border-slate-200 rounded-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400">01</span>
              <Camera className="w-5 h-5 text-blue-800" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">
              Report
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload a photo, describe the issue, or provide a voice report.
            </p>
          </div>

          {/* Step 02 */}
          <div className="bg-white border border-slate-200 rounded-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400">02</span>
              <FileSearch className="w-5 h-5 text-blue-800" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">
              Review
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              CivicSeva analyzes the information and suggests the issue category and responsible department.
            </p>
          </div>

          {/* Step 03 */}
          <div className="bg-white border border-slate-200 rounded-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400">03</span>
              <CheckSquare className="w-5 h-5 text-blue-800" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">
              Submit
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Review the details and submit the complaint.
            </p>
          </div>

          {/* Step 04 */}
          <div className="bg-white border border-slate-200 rounded-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400">04</span>
              <Clock className="w-5 h-5 text-blue-800" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">
              Track
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Follow the complaint status until resolution.
            </p>
          </div>
        </div>
      </section>

      {/* Common Civic Issues */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-200 pb-4 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Common civic issues
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Select a common category to start your report.
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

      {/* Short Explanation of the Service */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-50 border border-slate-200 rounded-md p-6 sm:p-8 space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            About CivicSeva Service Coordination
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            CivicSeva is an AI-assisted civic grievance platform deployed to improve public issue intake and administrative routing. Submitted photographs and descriptions are evaluated against municipal service standards to identify defect severity and route requests directly to responsible field squads. Residents maintain full control to review and edit all details prior to docket submission.
          </p>
        </div>
      </section>

      {/* My Neighborhood Grievances (List-Based View, NO Community Map) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                My Neighborhood Grievances
              </h2>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Sample neighborhood data
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
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
