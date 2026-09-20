import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Radio, Shield, AlertTriangle, CheckCircle2, Zap, RefreshCw, Eye, Play, Pause, Upload, MapPin, User, Phone, ArrowRight, Layers, Sliders, ExternalLink, Activity } from 'lucide-react';
import { cctvApi } from '../api/cctvApi';
import { SeverityBadge, StatusBadge } from '../components/StatusBadge';

export const CCTVVisionPage = () => {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState(true);
  const [dispatchedTicket, setDispatchedTicket] = useState(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [customFile, setCustomFile] = useState(null);
  const [customPreview, setCustomPreview] = useState(null);
  const [recentCctvTickets, setRecentCctvTickets] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load cameras
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const data = await cctvApi.getCameras();
        setCameras(data);
        if (data.length > 0) {
          setSelectedCamera(data[0]);
          // Automatically run scan on initial camera
          runScan(data[0]);
        }
      } catch {
        // Fallback demo cameras
      }
    };
    loadCameras();
  }, []);

  const runScan = async (cam = selectedCamera, file = customFile) => {
    if (!cam && !file) return;
    setIsScanning(true);
    setScanResult(null);
    setDispatchedTicket(null);

    try {
      const res = await cctvApi.scanFeed(cam ? cam.camera_id : null, file);
      setScanResult(res);

      // If continuous auto-dispatch is enabled and confidence > 85%, trigger auto dispatch!
      if (autoDispatchEnabled && res.auto_dispatch_recommended && res.confidence >= 0.85) {
        setTimeout(() => {
          handleAutoDispatch(res);
        }, 800);
      }
    } catch {
      // Ignored
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectCamera = (cam) => {
    setSelectedCamera(cam);
    setCustomFile(null);
    setCustomPreview(null);
    runScan(cam, null);
  };

  const handleCustomUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCustomFile(file);
      setCustomPreview(URL.createObjectURL(file));
      setSelectedCamera(null);
      runScan(null, file);
    }
  };

  const handleAutoDispatch = async (detection = scanResult) => {
    if (!detection) return;
    setIsDispatching(true);

    try {
      const cam = detection.camera || selectedCamera || {};
      const payload = {
        camera_id: cam.camera_id || 'CCTV-CUSTOM-01',
        defect_type: detection.primary_issue?.toUpperCase() || detection.category || 'POTHOLE',
        severity: detection.severity || 'HIGH',
        address: cam.address || 'Smart City Surveillance Zone, Pune',
        latitude: cam.latitude || 18.5204,
        longitude: cam.longitude || 73.8567,
        image_url: customPreview || cam.sample_snapshot || '/sample_evidence/pothole.jpg',
        description: detection.description,
        confidence: detection.confidence || 0.95,
        detections: detection.detections
      };

      const res = await cctvApi.autoDispatch(payload);
      setDispatchedTicket(res);
      setRecentCctvTickets(prev => [res, ...prev.slice(0, 4)]);
    } catch {
      // Ignored
    } finally {
      setIsDispatching(false);
    }
  };

  const currentDisplayImage = customPreview || (selectedCamera ? selectedCamera.sample_snapshot : '/sample_evidence/pothole.jpg');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
            <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Smart City Edge Vision Surveillance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
            CCTV AI Defect Scanner & Surveillance Radar
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time Computer Vision model continuously inspecting municipal traffic feeds to detect potholes, garbage overflow, water leaks, and street hazards autonomously.
          </p>
        </div>

        {/* Watchdog Switch */}
        <div className="flex items-center gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 self-start sm:self-auto text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Autonomous CCTV Watchdog</span>
            <strong className="text-emerald-400 block font-mono">
              {autoDispatchEnabled ? 'Auto-Dispatch ON' : 'Manual Triage Mode'}
            </strong>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoDispatchEnabled}
              onChange={(e) => setAutoDispatchEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {/* Main Surveillance Interface Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: ACTIVE CCTV FEED MONITOR (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-950 rounded-3xl border border-slate-800 p-4 shadow-2xl overflow-hidden space-y-3">
            {/* Monitor Top Bar */}
            <div className="flex items-center justify-between px-2 text-xs font-mono text-slate-400 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                <span className="text-rose-400 font-bold">REC &bull; LIVE</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-200 font-bold">
                  {selectedCamera ? selectedCamera.camera_id : 'CUSTOM-UPLOAD'}
                </span>
                <span className="text-slate-500 hidden sm:inline">
                  ({selectedCamera ? selectedCamera.resolution : 'Custom 1080p'})
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-slate-300">{currentTime} IST</span>
                <button
                  type="button"
                  onClick={() => runScan()}
                  disabled={isScanning}
                  className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>Scan Stream</span>
                </button>
              </div>
            </div>

            {/* Video / Snapshot Viewport with AI HUD Overlay */}
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-black flex items-center justify-center group">
              <img
                src={currentDisplayImage}
                alt="CCTV Live Stream"
                className="w-full h-full object-cover filter contrast-105"
              />

              {/* Scanning Radar Scanline Animation */}
              {isScanning && (
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-emerald-500/25 to-transparent animate-pulse pointer-events-none border-b-2 border-emerald-400"></div>
              )}

              {/* HUD Crosshairs */}
              <div className="absolute top-4 left-4 font-mono text-[10px] text-emerald-400 bg-black/60 px-2 py-1 rounded border border-emerald-500/30">
                LAT: {selectedCamera?.latitude || 18.5204} | LON: {selectedCamera?.longitude || 73.8567}
              </div>

              <div className="absolute top-4 right-4 font-mono text-[10px] text-slate-400 bg-black/60 px-2 py-1 rounded border border-slate-700">
                FPS: 59.8 &bull; BITRATE: 4.8 Mbps
              </div>

              {/* AI COMPUTER VISION BOUNDING BOXES OVERLAY */}
              {scanResult && scanResult.detections && scanResult.detections.map((det) => (
                <div
                  key={det.id}
                  style={{
                    left: `${det.box_percent.x}%`,
                    top: `${det.box_percent.y}%`,
                    width: `${det.box_percent.width}%`,
                    height: `${det.box_percent.height}%`
                  }}
                  className="absolute border-2 border-rose-500 bg-rose-500/15 rounded-lg pointer-events-none transition-all duration-300 animate-scale-up"
                >
                  {/* Bounding box corner brackets */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-rose-400"></div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-rose-400"></div>
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-rose-400"></div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-rose-400"></div>

                  {/* Identification Label Tag */}
                  <div className="absolute -top-7 left-0 bg-rose-600 text-white font-mono text-[10px] font-black px-2 py-0.5 rounded shadow-lg flex items-center gap-1 whitespace-nowrap">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{det.label.toUpperCase()} &bull; {Math.round(det.confidence * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Monitor Bar */}
            <div className="p-3 bg-slate-900 rounded-xl flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>{selectedCamera ? selectedCamera.address : 'Custom Camera Upload'}</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                Model: CivicSeva-EdgeVision-v3 (YOLO-Civic)
              </span>
            </div>
          </div>

          {/* AI DEFECT DETECTION TELEMETRY CARD */}
          {scanResult && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                    Defect Identified by Vision Model
                  </span>
                  <h3 className="text-xl font-bold font-heading text-slate-900 mt-1.5 flex items-center gap-2">
                    <span>{scanResult.primary_issue} Detected</span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      ({Math.round(scanResult.confidence * 100)}% Match Confidence)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{scanResult.description}</p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <SeverityBadge severity={scanResult.severity} />
                  <span className="px-3 py-1 rounded-xl bg-slate-100 font-bold text-slate-800 text-xs font-mono">
                    {scanResult.processing_latency_ms}ms Latency
                  </span>
                </div>
              </div>

              {/* Defect Diagnostics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Department</span>
                  <strong className="text-sm font-bold text-slate-900 block mt-0.5">
                    {scanResult.responsible_department}
                  </strong>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Public Safety Impact</span>
                  <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">
                    {scanResult.detections[0]?.safety_hazard || 'Vehicular and pedestrian hazard.'}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Recommended Directive</span>
                  <p className="text-emerald-800 font-medium text-[11px] mt-0.5 line-clamp-2">
                    {scanResult.detections[0]?.recommended_action || 'Immediate field dispatch.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>AI ready to auto-dispatch work order to the nearest available squad.</span>
                </span>

                <button
                  type="button"
                  onClick={() => handleAutoDispatch(scanResult)}
                  disabled={isDispatching || dispatchedTicket}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isDispatching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Dispatching Squad via Radar...</span>
                    </>
                  ) : dispatchedTicket ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Docket #{dispatchedTicket.complaint_id} Dispatched!</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>Dispatch Nearest Field Squad</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* DISPATCHED CONFIRMATION CARD */}
          {dispatchedTicket && (
            <div className="p-6 bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-3xl border border-emerald-700 shadow-xl space-y-3 animate-scale-up">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Autonomous CCTV Work Order Created</span>
                </span>
                <Link
                  to={`/track/${dispatchedTicket.complaint_id}`}
                  className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Track Live Docket #{dispatchedTicket.complaint_id}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div>
                  <strong className="text-base font-bold text-white block">
                    Squad Dispatched: {dispatchedTicket.assigned_officer?.name}
                  </strong>
                  <span className="text-xs text-slate-300 block">
                    {dispatchedTicket.assigned_officer?.role} &bull; 📞 {dispatchedTicket.assigned_officer?.phone}
                  </span>
                </div>

                <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 text-center self-start sm:self-auto font-mono text-xs">
                  <span className="text-[10px] text-slate-400 block font-semibold">Live Proximity</span>
                  <strong className="text-emerald-400">
                    {dispatchedTicket.assigned_officer?.distance_km} km &bull; ETA {dispatchedTicket.assigned_officer?.eta_minutes} mins
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CAMERA SELECTOR & UPLOAD (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Camera Grid Channels */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-600" />
                <span>Smart City Camera Channels</span>
              </h4>
              <span className="text-[10px] font-mono text-emerald-600 font-bold">5 Online</span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {cameras.map((cam) => {
                const isSelected = selectedCamera?.camera_id === cam.camera_id;
                return (
                  <button
                    key={cam.camera_id}
                    type="button"
                    onClick={() => handleSelectCamera(cam)}
                    className={`w-full text-left p-3 rounded-2xl border transition flex items-center gap-3 ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-14 h-11 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 relative">
                      <img src={cam.sample_snapshot} alt={cam.name} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs font-bold text-slate-900 truncate block">
                          {cam.camera_id}
                        </strong>
                        <span className="text-[10px] font-mono text-slate-400">{cam.zone?.split('-')[0]}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate">{cam.name}</p>
                      <span className="text-[10px] text-indigo-700 font-semibold block truncate">
                        🎯 {cam.primary_focus}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test Any Custom CCTV Frame Upload */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Test Custom CCTV Frame</span>
            </h4>
            <p className="text-xs text-slate-500">
              Upload an image from any external surveillance camera to test real-time AI defect localization.
            </p>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-slate-50/80 hover:bg-emerald-50/30 rounded-2xl p-6 text-center transition cursor-pointer">
              <Camera className="w-6 h-6 text-slate-400 mb-1" />
              <strong className="text-xs font-bold text-slate-700">Drop CCTV Image / Frame</strong>
              <span className="text-[10px] text-slate-400">JPG, PNG up to 10MB</span>
              <input type="file" accept="image/*" onChange={handleCustomUpload} className="hidden" />
            </label>
          </div>

          {/* Recent CCTV Incident Feed */}
          {recentCctvTickets.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>Recent Camera Dispatches</span>
              </h4>

              <div className="divide-y divide-slate-100 text-xs">
                {recentCctvTickets.map((t, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-indigo-700">#{t.complaint_id}</span>
                      <span className="text-slate-600 block text-[11px] capitalize">{t.defect_type}</span>
                    </div>
                    <Link to={`/track/${t.complaint_id}`} className="text-[11px] font-semibold text-emerald-600 hover:underline">
                      Track →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
