import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Upload, MapPin, Sparkles, AlertCircle, FileText, CheckCircle2, RefreshCw, Edit3, ArrowRight, ShieldCheck, ChevronDown, ChevronUp, Mic, Zap, Check, Radio, Building2, User, Phone, Navigation, Camera, Layers, Copy, Share2, Clock, CheckCheck } from 'lucide-react';
import { complaintApi } from '../api/complaintApi';
import { AudioRecorder } from '../components/AudioRecorder';
import { LeafletMap } from '../components/LeafletMap';
import { AgentTraceTimeline } from '../components/AgentTraceTimeline';
import { StatusBadge, SeverityBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export const ReportIssuePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mode: 'PHOTO' (Zero-Touch Photo Drop) or 'FORM' (Voice & Guided Input)
  const [activeMode, setActiveMode] = useState('PHOTO');

  // Instant Auto-Dispatch on Photo Upload
  const [instantAutoDispatch, setInstantAutoDispatch] = useState(true);
  const [copiedSlip, setCopiedSlip] = useState(false);

  // Inputs
  const [text, setText] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [address, setAddress] = useState('MG Road near College Main Gate, Pune');
  const [location, setLocation] = useState({ latitude: 18.5204, longitude: 73.8567, address: 'MG Road near College Main Gate, Pune' });
  const [gpsActive, setGpsActive] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoDispatching, setIsAutoDispatching] = useState(false);
  const [autoDispatchStep, setAutoDispatchStep] = useState(0);
  const [autoDispatchResult, setAutoDispatchResult] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showTechnicalTrace, setShowTechnicalTrace] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  // User-editable fields
  const [editedDescription, setEditedDescription] = useState('');
  const [editedSeverity, setEditedSeverity] = useState('HIGH');

  // Attempt browser GPS acquisition on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            address: 'Live Device GPS Detected (Pune Central Ward)'
          });
          setAddress('Live Device GPS Detected (Pune Central Ward)');
          setGpsActive(true);
        },
        () => {
          setGpsActive(false);
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // Handle preset queries (e.g. ?demo=pothole)
  useEffect(() => {
    const demo = searchParams.get('demo');
    if (demo === 'pothole') {
      loadPreset('pothole');
    } else if (demo === 'garbage') {
      loadPreset('garbage');
    } else if (demo === 'streetlight') {
      loadPreset('streetlight');
    } else if (demo === 'water') {
      loadPreset('water');
    }
  }, [searchParams]);

  const loadPreset = (type, autoTrigger = false) => {
    setAutoDispatchResult(null);
    setAnalysisResult(null);
    let sampleText = '';
    let sampleAddr = '';
    let sampleLoc = {};
    let sampleImg = '';

    if (type === 'pothole') {
      sampleText = 'There is a large deep crater pothole near the college gate on the main road. Scooters are swerving dangerously.';
      sampleAddr = 'MG Road near College Main Gate, Pune';
      sampleLoc = { latitude: 18.5204, longitude: 73.8567, address: 'MG Road near College Main Gate, Pune' };
      sampleImg = '/sample_evidence/pothole.jpg';
    } else if (type === 'garbage') {
      sampleText = 'Massive pile of uncollected rotting garbage outside school gate attracting stray animals and blocking footpath.';
      sampleAddr = 'Station Road Community Center, Pune';
      sampleLoc = { latitude: 18.5280, longitude: 73.8650, address: 'Station Road Community Center, Pune' };
      sampleImg = '/sample_evidence/garbage.jpg';
    } else if (type === 'streetlight') {
      sampleText = 'Dark stretch of broken streetlights near park. Exposed electric wire hanging dangerously from pole.';
      sampleAddr = 'Outer Bypass Road near Park, Pune';
      sampleLoc = { latitude: 18.5350, longitude: 73.8400, address: 'Outer Bypass Road near Park, Pune' };
      sampleImg = '/sample_evidence/streetlight.jpg';
    } else if (type === 'water') {
      sampleText = 'Drinking water pipeline burst with heavy stream flooding street for past 24 hours.';
      sampleAddr = 'Market Circle Main Road, Pune';
      sampleLoc = { latitude: 18.5150, longitude: 73.8500, address: 'Market Circle Main Road, Pune' };
      sampleImg = '/sample_evidence/water_leak.jpg';
    }

    setText(sampleText);
    setAddress(sampleAddr);
    setLocation(sampleLoc);
    setImagePreview(sampleImg);
    setImageFile(null);

    if (autoTrigger) {
      setTimeout(() => {
        executeAutoDispatch({
          text: sampleText,
          address: sampleAddr,
          latitude: sampleLoc.latitude,
          longitude: sampleLoc.longitude,
          image_url: sampleImg
        });
      }, 100);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setAnalysisResult(null);
      setAutoDispatchResult(null);

      // If zero-click instant dispatch is enabled, immediately trigger!
      if (instantAutoDispatch) {
        handlePhotoInstantDispatch(file);
      }
    }
  };

  const executeAutoDispatch = async (payload) => {
    setIsAutoDispatching(true);
    setAutoDispatchStep(1);
    setErrorMessage(null);
    setAutoDispatchResult(null);

    try {
      setTimeout(() => setAutoDispatchStep(2), 250);
      setTimeout(() => setAutoDispatchStep(3), 500);

      const result = await complaintApi.autoDispatchComplaint(payload);

      setAutoDispatchStep(4);
      setTimeout(() => {
        setAutoDispatchResult(result);
        setIsAutoDispatching(false);
      }, 400);
    } catch (err) {
      setErrorMessage(err.message || 'Auto-dispatch could not complete. Please try again.');
      setIsAutoDispatching(false);
    }
  };

  // Zero-Click Photo Instant Dispatch
  const handlePhotoInstantDispatch = async (fileToDispatch = imageFile) => {
    if (!fileToDispatch && !imagePreview) {
      setErrorMessage('Please select or drop a photo to dispatch.');
      return;
    }

    setIsAutoDispatching(true);
    setAutoDispatchStep(1);
    setErrorMessage(null);
    setAutoDispatchResult(null);

    try {
      setTimeout(() => setAutoDispatchStep(2), 250);
      setTimeout(() => setAutoDispatchStep(3), 500);

      let result;
      if (fileToDispatch) {
        result = await complaintApi.photoInstantDispatch(fileToDispatch, {
          latitude: location.latitude,
          longitude: location.longitude,
          address: address || location.address
        });
      } else {
        result = await complaintApi.autoDispatchComplaint({
          text: text || 'Citizen snapped photo evidence of neighborhood defect.',
          address: address || location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          image_url: imagePreview
        });
      }

      setAutoDispatchStep(4);
      setTimeout(() => {
        setAutoDispatchResult(result);
        setIsAutoDispatching(false);
      }, 400);

    } catch (err) {
      setErrorMessage(err.message || 'Auto-dispatch could not complete. Please try again.');
      setIsAutoDispatching(false);
    }
  };

  // 1-Click Multi-Modal Autonomous Auto-Dispatch
  const handleAutoDispatch = async () => {
    const combined = [text, voiceText].filter(Boolean).join(' ');
    if (!combined && !imagePreview) {
      setErrorMessage('Please enter what the problem is, speak via microphone, or pick a quick preset.');
      return;
    }

    let uploadedImageUrl = imagePreview;
    if (imageFile) {
      try {
        const uploadRes = await complaintApi.uploadImage(imageFile);
        uploadedImageUrl = uploadRes.file_url;
      } catch {}
    }

    await executeAutoDispatch({
      text: combined,
      voice_transcription: voiceText,
      address: address || location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      image_url: uploadedImageUrl
    });
  };

  // Generate shareable WhatsApp text slip
  const getWhatsAppSlip = () => {
    if (!autoDispatchResult) return '';
    const off = autoDispatchResult.assigned_officer;
    return `🏛️ *CIVICSEVA CITIZEN GRIEVANCE RECEIPT*
🆔 *Docket Number:* #${autoDispatchResult.complaint_id}
⚠️ *Issue:* ${autoDispatchResult.issue_type} (${autoDispatchResult.severity} Priority)
📍 *Location:* ${autoDispatchResult.address}
🏢 *Department:* ${autoDispatchResult.department}
👷 *Assigned Squad:* ${off ? off.name : 'Municipal Flying Squad'} (${off ? off.role : 'Field Engineer'})
📞 *Direct Squad Phone:* ${off ? off.phone : '+91 20 2550 1100'}
🛰️ *Proximity:* ${off ? off.distance_km : '0.8'} km away | *Arrival ETA:* ${off ? off.eta_minutes : '15'} mins
⏱️ *SLA Guarantee:* 48-Hour Resolution Window
🔗 *Track Live Progress:* ${window.location.origin}/track/${autoDispatchResult.complaint_id}`;
  };

  const handleCopySlip = () => {
    navigator.clipboard.writeText(getWhatsAppSlip());
    setCopiedSlip(true);
    setTimeout(() => setCopiedSlip(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getWhatsAppSlip());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Manual Review Mode: Run AI Analysis first
  const handleAnalyze = async () => {
    const combined = [text, voiceText].filter(Boolean).join(' ');
    if (!combined && !imagePreview) {
      setErrorMessage('Please type or speak what the issue is, or select an image.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      let uploadedImageUrl = imagePreview;
      if (imageFile) {
        try {
          const uploadRes = await complaintApi.uploadImage(imageFile);
          uploadedImageUrl = uploadRes.file_url;
        } catch {}
      }

      const result = await complaintApi.analyzeComplaint({
        text: combined,
        voice_transcription: voiceText,
        address: address || location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        image_url: uploadedImageUrl
      });

      setAnalysisResult(result);
      setEditedDescription(result.system_generated?.generated_complaint_text || combined);
      setEditedSeverity(result.ai_predictions?.severity || 'HIGH');
      setIsEditingDraft(false);

      setTimeout(() => {
        document.getElementById('ai-result-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setErrorMessage(err.message || 'AI Analysis could not complete. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Confirm & Submit from manual review
  const handleConfirmSubmit = async () => {
    if (!analysisResult) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const preds = analysisResult.ai_predictions;
    const sys = analysisResult.system_generated;

    try {
      const payload = {
        category: preds.category,
        issue_type: preds.issue_type?.toUpperCase(),
        description: text || voiceText || 'Citizen reported civic infrastructure defect.',
        generated_complaint: editedDescription,
        latitude: location.latitude,
        longitude: location.longitude,
        address: address || location.address,
        severity: editedSeverity,
        ai_confidence: preds.confidence,
        severity_reason: preds.severity_reason,
        grounded_explanation: preds.grounded_explanation,
        recommended_action: preds.recommended_action,
        evidence_urls: imagePreview ? [imagePreview] : [],
        decision_trace: sys.decision_trace || []
      };

      const submitted = await complaintApi.submitComplaint(payload);
      navigate(`/track/${submitted.id}?new=true`);
    } catch (err) {
      setErrorMessage(err.message || 'Could not submit complaint.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Friendly Page Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-1">
          <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
          <span>Autonomous Geo-Proximity Dispatch Active</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
          Report a Civic Issue
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Upload a photo or speak. Our Vision AI detects the defect, auto-checks the department, finds the closest free field squad, and dispatches the task with zero friction.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex justify-center">
        <div className="bg-slate-200/80 p-1 rounded-2xl flex gap-1 border border-slate-300">
          <button
            type="button"
            onClick={() => { setActiveMode('PHOTO'); setAnalysisResult(null); setAutoDispatchResult(null); }}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              activeMode === 'PHOTO'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>📸 Zero-Click Photo Mode</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('FORM'); setAnalysisResult(null); setAutoDispatchResult(null); }}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              activeMode === 'FORM'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mic className="w-4 h-4 text-blue-600" />
            <span>📝 Voice & Text Mode</span>
          </button>
        </div>
      </div>

      {/* 1-Click Quick Scenario Presets */}
      <div className="bg-slate-100/90 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 border border-slate-200">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <span>✨ 1-Click Test Scenarios:</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => loadPreset('pothole', true)}
            className="text-xs bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-semibold px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition flex items-center gap-1"
          >
            <span>🚧 Road Pothole</span>
            <span className="text-[10px] text-emerald-600 font-bold">&bull; Auto-Dispatch</span>
          </button>
          <button
            type="button"
            onClick={() => loadPreset('garbage', true)}
            className="text-xs bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-semibold px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition flex items-center gap-1"
          >
            <span>🗑️ Garbage Dump</span>
            <span className="text-[10px] text-emerald-600 font-bold">&bull; Auto-Dispatch</span>
          </button>
          <button
            type="button"
            onClick={() => loadPreset('streetlight', true)}
            className="text-xs bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-semibold px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition flex items-center gap-1"
          >
            <span>💡 Dark Streetlight</span>
            <span className="text-[10px] text-emerald-600 font-bold">&bull; Auto-Dispatch</span>
          </button>
          <button
            type="button"
            onClick={() => loadPreset('water', true)}
            className="text-xs bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-semibold px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition flex items-center gap-1"
          >
            <span>🚰 Water Pipe Burst</span>
            <span className="text-[10px] text-emerald-600 font-bold">&bull; Auto-Dispatch</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* CELEBRATORY AUTONOMOUS SUCCESS CARD */}
      {autoDispatchResult && (
        <div className="bg-white rounded-3xl border-2 border-emerald-500 p-6 sm:p-8 shadow-2xl space-y-6 animate-scale-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Autonomously Dispatched & Squad Assigned</span>
              </span>
              <h2 className="text-2xl font-black text-slate-900 font-heading">
                Docket #{autoDispatchResult.complaint_id} Created!
              </h2>
              <p className="text-xs text-slate-500">
                CivicSeva AI diagnosed the defect, auto-routed to {autoDispatchResult.department}, and matched the closest free field squad.
              </p>
            </div>

            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-center flex-shrink-0">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">AI Match Confidence</span>
              <span className="text-2xl font-black text-emerald-600">
                {Math.round((autoDispatchResult.confidence || 0.92) * 100)}%
              </span>
            </div>
          </div>

          {/* Assigned Officer & Geo-Proximity Highlight Card */}
          {autoDispatchResult.assigned_officer && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 rounded-2xl p-5 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>Assigned Field Officer (Closest Squad)</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-bold text-[10px]">
                  ⭐ 4.9 Rating &bull; Available
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <strong className="text-base font-bold text-slate-900 block">
                    {autoDispatchResult.assigned_officer.name}
                  </strong>
                  <span className="text-xs text-slate-600 block">
                    {autoDispatchResult.assigned_officer.role}
                  </span>
                  <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Squad Direct: {autoDispatchResult.assigned_officer.phone}</span>
                  </span>
                </div>

                <div className="bg-white px-4 py-3 rounded-xl border border-emerald-200 text-center self-start sm:self-auto shadow-sm">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Proximity</span>
                      <strong className="text-sm font-mono text-slate-800">
                        {autoDispatchResult.assigned_officer.distance_km} km
                      </strong>
                    </div>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Target ETA</span>
                      <strong className="text-sm font-mono text-emerald-600">
                        {autoDispatchResult.assigned_officer.eta_minutes} mins
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-slate-600 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                <span>
                  <strong>AI Match Explanation:</strong> Matched {autoDispatchResult.assigned_officer.name} because they are closest to your coordinates ({autoDispatchResult.assigned_officer.distance_km} km) with zero backlog.
                </span>
              </div>
            </div>
          )}

          {/* Guaranteed SLA Countdown Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-white">48-Hour Municipal Service SLA Guarantee</strong>
                <span className="text-slate-400 text-[11px]">
                  Autonomous Watchdog will trigger statutory escalations if not resolved within window.
                </span>
              </div>
            </div>

            <div className="font-mono text-emerald-400 text-sm font-bold bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 self-start sm:self-auto">
              ⏱️ 47h 59m Remaining
            </div>
          </div>

          {/* Neighborhood Cluster Alert (if duplicate within 50m) */}
          {autoDispatchResult.cluster_info?.is_clustered && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <Layers className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-950 font-bold">
                  🔗 Clustered with Neighborhood Incident #{autoDispatchResult.cluster_info.cluster_master_id}
                </strong>
                <span>
                  Multiple citizens reported this defect within a 50m radius. Work order priority was autonomously escalated to expedite crew dispatch!
                </span>
              </div>
            </div>
          )}

          {/* DIGITAL CITIZEN GRIEVANCE RECEIPT & WHATSAPP SHARE CARD */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>Official Citizen WhatsApp / SMS Receipt Card</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySlip}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px] transition flex items-center gap-1"
                >
                  {copiedSlip ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSlip ? 'Copied!' : 'Copy Slip'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition flex items-center gap-1"
                >
                  <span>📲 Share on WhatsApp</span>
                </button>
              </div>
            </div>

            <pre className="text-[11px] font-mono text-slate-700 bg-white p-3 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
              {getWhatsAppSlip()}
            </pre>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              to={`/track/${autoDispatchResult.complaint_id}?new=true`}
              className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Track Live Docket #{autoDispatchResult.complaint_id}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setAutoDispatchResult(null);
                setText('');
                setVoiceText('');
                setImageFile(null);
                setImagePreview(null);
              }}
              className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              Report Another Issue
            </button>
          </div>
        </div>
      )}

      {/* MODE 1: ZERO-CLICK PHOTO-ONLY INSTANT DISPATCH */}
      {!autoDispatchResult && activeMode === 'PHOTO' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="text-center max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              Drop Photo & Done (Zero Typing)
            </h3>
            <p className="text-xs text-slate-500">
              Upload or snap an image. Our Vision AI identifies the issue, grabs your GPS, matches the closest field officer, and dispatches immediately.
            </p>
          </div>

          {/* Toggle for Instant Zero-Click Execution */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              <span className="font-bold text-emerald-900">Instant Auto-Dispatch upon Photo Select</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={instantAutoDispatch}
                onChange={(e) => setInstantAutoDispatch(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Big Photo Dropzone */}
          <div className="space-y-4">
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 group h-56 bg-slate-100 flex items-center justify-center shadow-md">
                <img src={imagePreview} alt="Evidence Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); setAutoDispatchResult(null); }}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black text-white text-xs font-bold transition shadow"
                >
                  ✕ Change Photo
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-400/80 bg-emerald-50/20 hover:bg-emerald-50/50 rounded-3xl p-10 text-center transition cursor-pointer h-56 group">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition shadow-sm">
                  <Camera className="w-7 h-7" />
                </div>
                <strong className="text-sm font-bold text-slate-900 block">
                  Click to Upload or Drag Photo Here
                </strong>
                <span className="text-xs text-slate-500 mt-0.5">
                  Potholes, trash piles, streetlights, leaks &bull; Auto-detects GPS coordinates
                </span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}

            {/* GPS Status Indicator */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{address}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                {gpsActive ? 'Live GPS Active' : 'Default Ward GPS'}
              </span>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => handlePhotoInstantDispatch(imageFile)}
              disabled={isAutoDispatching}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-base shadow-xl shadow-emerald-600/30 transition flex items-center justify-center gap-2.5 disabled:opacity-75"
            >
              {isAutoDispatching ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>
                    {autoDispatchStep === 1 && '📸 Step 1/4: Analyzing Image with Multimodal Vision AI...'}
                    {autoDispatchStep === 2 && '🏛️ Step 2/4: Auto-checking Responsible Department...'}
                    {autoDispatchStep === 3 && '🛰️ Step 3/4: Locating Closest Free Field Officer...'}
                    {autoDispatchStep >= 4 && '🚀 Step 4/4: Task Dispatched to Officer!'}
                  </span>
                </div>
              ) : (
                <>
                  <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                  <span>⚡ Instant Photo Auto-Dispatch (Zero Manual Work)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: GUIDED FORM & VOICE MODE */}
      {!autoDispatchResult && activeMode === 'FORM' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">1</span>
                <span>Describe the issue (Voice or Text)</span>
              </label>
              <span className="text-[11px] text-slate-400">Speak or write in natural language</span>
            </div>

            <textarea
              rows={3}
              value={text}
              onChange={(e) => { setText(e.target.value); setAnalysisResult(null); }}
              placeholder="e.g. Large pothole on the road near college gate damaging vehicles..."
              className="w-full text-sm p-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition bg-slate-50/50"
            />

            <AudioRecorder
              onTranscriptionReceived={(t) => { setVoiceText(t); setText(t); setAnalysisResult(null); }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">2</span>
                <span>Photo Evidence</span>
              </label>

              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 group h-36 bg-slate-100 flex items-center justify-center">
                  <img src={imagePreview} alt="Evidence Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); setAnalysisResult(null); }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white text-xs hover:bg-black transition"
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 hover:border-emerald-300 transition cursor-pointer h-36">
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs font-bold text-slate-700">Click to upload photo</span>
                  <span className="text-[11px] text-slate-400">JPG, PNG up to 10MB</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">3</span>
                <span>Location Pinpoint</span>
              </label>

              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setLocation({ ...location, address: e.target.value });
                  setAnalysisResult(null);
                }}
                placeholder="e.g. MG Road near College Gate, Pune"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />

              <div className="h-28 rounded-xl overflow-hidden border border-slate-200">
                <LeafletMap
                  center={[location.latitude || 18.5204, location.longitude || 73.8567]}
                  selectedLocation={location}
                  onLocationSelected={(loc) => {
                    setLocation(loc);
                    setAddress(loc.address);
                    setAnalysisResult(null);
                  }}
                  height="100%"
                  zoom={14}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 space-y-3">
            <button
              type="button"
              onClick={handleAutoDispatch}
              disabled={isAutoDispatching || isAnalyzing}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-base shadow-xl shadow-emerald-600/30 transition flex items-center justify-center gap-2.5 disabled:opacity-75"
            >
              {isAutoDispatching ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>
                    {autoDispatchStep === 1 && '🧠 Step 1/4: Analyzing Grievance...'}
                    {autoDispatchStep === 2 && '🏛️ Step 2/4: Checking Department...'}
                    {autoDispatchStep === 3 && '⚖️ Step 3/4: Matching Closest Officer...'}
                    {autoDispatchStep >= 4 && '🚀 Step 4/4: Dispatched!'}
                  </span>
                </div>
              ) : (
                <>
                  <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                  <span>⚡ 1-Click AI Auto-Dispatch (Zero Manual Work)</span>
                </>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || isAutoDispatching}
                className="text-xs font-semibold text-slate-500 hover:text-emerald-700 transition inline-flex items-center gap-1 py-1"
              >
                <span>Prefer to inspect draft first?</span>
                <span className="underline text-emerald-600">Review Before Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL REVIEW CARD (If citizen clicks 'Review Before Dispatch') */}
      {analysisResult && !autoDispatchResult && (
        <div id="ai-result-section" className="bg-white rounded-3xl border-2 border-emerald-500 p-6 sm:p-8 shadow-xl space-y-6 animate-scale-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>AI Department Match Ready</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-heading text-slate-900">
                Review Grievance Details
              </h2>
              <p className="text-xs text-slate-500">
                Review the AI-generated ticket before dispatching to the municipal office.
              </p>
            </div>

            <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-200 text-center self-start sm:self-auto">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">AI Match Confidence</span>
              <span className="text-xl font-black text-emerald-600">
                {Math.round((analysisResult.ai_predictions?.confidence || 0.90) * 100)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-slate-400 font-semibold block">Identified Problem</span>
              <strong className="text-sm font-bold text-slate-900 block capitalize">
                {analysisResult.ai_predictions?.display_issue_type || 'Civic Defect'}
              </strong>
              <span className="text-[11px] text-slate-500 capitalize">
                Category: {analysisResult.ai_predictions?.category?.replace('_', ' ')}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-slate-400 font-semibold block">Auto-Checked Department</span>
              <strong className="text-sm font-bold text-slate-900 block truncate">
                {analysisResult.ai_predictions?.department}
              </strong>
              <span className="text-[11px] text-emerald-700 font-medium">
                SOP Grounded ({analysisResult.ai_predictions?.rag_source?.doc_id || 'Bylaws'})
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-slate-400 font-semibold block">Urgency Level</span>
              <div className="pt-0.5">
                <SeverityBadge severity={editedSeverity} />
              </div>
              <span className="text-[11px] text-slate-500 block line-clamp-1">
                {analysisResult.ai_predictions?.severity_reason?.split('.')[0] || 'Safety hazard'}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-slate-400 font-semibold block">Expected SLA</span>
              <strong className="text-sm font-bold text-slate-900 block">
                {analysisResult.system_generated?.estimated_sla_hours || 48} Hours
              </strong>
              <span className="text-[11px] text-slate-500">
                Target turnaround
              </span>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Generated Official Ticket Draft</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingDraft(!isEditingDraft)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingDraft ? 'Done Editing' : 'Edit Text'}</span>
              </button>
            </div>

            {isEditingDraft ? (
              <textarea
                rows={6}
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="w-full text-xs font-mono p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            ) : (
              <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {editedDescription}
              </pre>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowTechnicalTrace(!showTechnicalTrace)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <span>{showTechnicalTrace ? 'Hide Decision Steps' : 'View AI Decision Steps'}</span>
              {showTechnicalTrace ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting to City Office...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Dispatch Ticket</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {showTechnicalTrace && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <AgentTraceTimeline trace={analysisResult.system_generated?.decision_trace} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
