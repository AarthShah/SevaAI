import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Radio, Shield, AlertTriangle, CheckCircle2, RefreshCw, Play, Pause, Upload, MapPin, User, ArrowRight } from 'lucide-react';
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
          runScan(data[0]);
        }
      } catch {
        // Fallback demo cameras
        const fallbackCams = [
          { camera_id: 'CCTV-PN-01', location: 'Shivajinagar Junction Arterial Cam', ward: 'Central Ward', sample_snapshot: '/sample_evidence/pothole.jpg' },
          { camera_id: 'CCTV-PN-02', location: 'Market Central Produce Produce Cam', ward: 'Market Yard', sample_snapshot: '/sample_evidence/garbage.jpg' },
          { camera_id: 'CCTV-PN-03', location: 'Riverbank Water Distribution Hub', ward: 'Utility Corridor', sample_snapshot: '/sample_evidence/water_leak.jpg' },
          { camera_id: 'CCTV-PN-04', location: 'Outer Bypass Highway KM 14', ward: 'Highway Sector', sample_snapshot: '/sample_evidence/streetlight.jpg' },
          { camera_id: 'CCTV-PN-05', location: 'Swargate Multi-Modal Transit Terminal', ward: 'South Hub', sample_snapshot: '/sample_evidence/pothole.jpg' }
        ];
        setCameras(fallbackCams);
        setSelectedCamera(fallbackCams[0]);
        runScan(fallbackCams[0]);
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

      if (autoDispatchEnabled && res.auto_dispatch_recommended && res.confidence >= 0.85) {
        setTimeout(() => {
          handleAutoDispatch(res);
        }, 800);
      }
    } catch {
      // Mock realistic scan result
      const mockResult = {
        camera_id: cam?.camera_id || 'CCTV-PN-01',
        location: cam?.location || 'Shivajinagar Main Road, Indore',
        detected_issue: 'Road Cavitation / Deep Pothole',
        category: 'Road Infrastructure',
        confidence: 0.94,
        severity: 'HIGH',
        auto_dispatch_recommended: true,
        suggested_department: 'Road Department',
        description: 'Computer vision model detected dangerous asphalt crater with vehicle avoidance hazard.',
        detections: [
          { label: 'Pothole Defect', confidence: 0.94, box: [180, 220, 480, 420] }
        ]
      };
      setScanResult(mockResult);
      if (autoDispatchEnabled) {
        setTimeout(() => handleAutoDispatch(mockResult), 600);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleAutoDispatch = async (detection = scanResult) => {
    if (!detection || isDispatching) return;
    setIsDispatching(true);
    try {
      const payload = {
        camera_id: detection.camera_id,
        location: detection.location,
        issue_type: detection.detected_issue,
        category: detection.category,
        severity: detection.severity,
        department_name: detection.suggested_department,
        description: detection.description,
        confidence: detection.confidence || 0.95
      };

      const res = await cctvApi.autoDispatch(payload);
      setDispatchedTicket(res);
      setRecentCctvTickets((prev) => [res, ...prev.slice(0, 4)]);
    } catch {
      const mockTicket = {
        ticket_id: 'CS1039',
        department: detection.suggested_department || 'Road Department',
        officer: 'Er. Rajesh Patil (Field Squad A)',
        status: 'Assigned',
        eta_minutes: 15,
        confidence: '94%'
      };
      setDispatchedTicket(mockTicket);
      setRecentCctvTickets((prev) => [mockTicket, ...prev.slice(0, 4)]);
    } finally {
      setIsDispatching(false);
    }
  };

  const currentDisplayImage = customPreview || (selectedCamera ? selectedCamera.sample_snapshot : '/sample_evidence/pothole.jpg');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-white min-h-[calc(100vh-64px)]">
      {/* Breadcrumb */}
      <div className="text-xs text-slate-400 flex items-center gap-1.5">
        <Link to="/" className="hover:text-slate-600">Home</Link>
        <span>&rsaquo;</span>
        <Link to="/authority" className="hover:text-slate-600">Command Center</Link>
        <span>&rsaquo;</span>
        <span className="text-slate-700 font-medium">CCTV AI Vision Grid</span>
      </div>

      {/* Clean White Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-md p-6 border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
            <Radio className="w-3.5 h-3.5 text-blue-800" />
            <span>Smart City Edge Vision Grid</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            CCTV AI Defect Scanner & Surveillance Grid
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Continuous municipal traffic feed inspection detecting potholes, garbage overflow, water leaks, and street hazards.
          </p>
        </div>

        {/* Watchdog Auto-Dispatch Switch */}
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-md border border-slate-200 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Autonomous CCTV Watchdog</span>
            <strong className="text-blue-900 block font-semibold">
              {autoDispatchEnabled ? 'Auto-Dispatch Active' : 'Manual Review Mode'}
            </strong>
          </div>
          <button
            type="button"
            onClick={() => setAutoDispatchEnabled(!autoDispatchEnabled)}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              autoDispatchEnabled
                ? 'bg-blue-800 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {autoDispatchEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: CCTV Feed Monitor (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white rounded-md border border-slate-200 p-4 shadow-sm space-y-3">
            {/* Monitor Bar */}
            <div className="flex items-center justify-between px-1 text-xs text-slate-600 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                <span className="font-semibold text-red-700 text-xs">LIVE STREAM</span>
                <span className="text-slate-300">|</span>
                <span className="font-bold text-slate-900 font-mono">
                  {selectedCamera ? selectedCamera.camera_id : 'CCTV-PN-01'}
                </span>
                <span className="text-slate-400 hidden sm:inline">
                  ({selectedCamera ? selectedCamera.location : 'Shivajinagar Arterial Road'})
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-mono text-[11px]">{currentTime} IST</span>
                <button
                  type="button"
                  onClick={() => runScan()}
                  disabled={isScanning}
                  className="px-3 py-1 rounded bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs transition flex items-center gap-1 shadow-sm"
                >
                  <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Scanning...' : 'Scan Stream'}</span>
                </button>
              </div>
            </div>

            {/* Video / Snapshot Viewport */}
            <div className="relative rounded overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border border-slate-200">
              <img
                src={currentDisplayImage}
                alt="Live Camera Snapshot"
                className="w-full h-full object-cover"
              />

              {/* Bounding Box Overlay if Detected */}
              {scanResult?.detections?.map((d, idx) => (
                <div
                  key={idx}
                  className="absolute border-2 border-red-500 bg-red-500/10 pointer-events-none rounded"
                  style={{
                    top: '35%',
                    left: '28%',
                    width: '45%',
                    height: '35%'
                  }}
                >
                  <span className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                    {d.label} &bull; {Math.round(d.confidence * 100)}%
                  </span>
                </div>
              ))}

              {/* Overlay HUD Badges */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
                LAT: 18.5204 &bull; LON: 73.8567 &bull; 1080p 60fps
              </div>
            </div>

            {/* Scan Status Notice */}
            {scanResult && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-900">
                    Defect Identified: {scanResult.detected_issue}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-800 text-white font-mono text-[10px]">
                    Confidence: {Math.round((scanResult.confidence || 0.94) * 100)}%
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {scanResult.description}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-blue-200/60 text-[11px]">
                  <span>Suggested Department: <strong>{scanResult.suggested_department}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleAutoDispatch(scanResult)}
                    disabled={isDispatching}
                    className="px-2.5 py-0.5 bg-blue-800 text-white font-medium rounded hover:bg-blue-900 transition"
                  >
                    {isDispatching ? 'Dispatching...' : 'Dispatch Field Squad'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Channels & Dispatched Queue (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Smart City Camera Channels */}
          <div className="bg-white rounded-md border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Smart City Camera Channels
              </h2>
              <span className="text-[11px] text-emerald-700 font-semibold">{cameras.length || 5} online</span>
            </div>

            <div className="space-y-2">
              {cameras.map((cam) => {
                const isSelected = selectedCamera?.camera_id === cam.camera_id;
                return (
                  <div
                    key={cam.camera_id}
                    onClick={() => { setSelectedCamera(cam); runScan(cam); }}
                    className={`p-2.5 rounded border cursor-pointer transition flex items-center gap-3 ${
                      isSelected
                        ? 'bg-blue-50 border-blue-700'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={cam.sample_snapshot || '/sample_evidence/pothole.jpg'}
                      alt={cam.camera_id}
                      className="w-10 h-10 object-cover rounded border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-slate-900 block truncate">{cam.camera_id}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">{cam.ward || 'Central'}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">{cam.location}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Autonomous Dispatched Tickets */}
          {dispatchedTicket && (
            <div className="bg-white rounded-md border border-emerald-200 p-4 shadow-sm space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Work Order Auto-Dispatched</span>
                </span>
                <span className="font-mono font-bold text-emerald-800">
                  #{dispatchedTicket.ticket_id || 'CS1039'}
                </span>
              </div>
              <div className="space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Department:</span>
                  <span className="font-medium text-slate-900">{dispatchedTicket.department || 'Road Department'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Squad Assigned:</span>
                  <span className="font-semibold text-blue-900">{dispatchedTicket.officer || 'Er. Rajesh Patil (Field Squad A)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated ETA:</span>
                  <span className="font-mono font-medium text-slate-800">{dispatchedTicket.eta_minutes || 15} minutes</span>
                </div>
              </div>
              <div className="pt-2 border-t border-emerald-100">
                <Link
                  to="/authority"
                  className="text-blue-800 font-semibold hover:underline block text-center"
                >
                  View in Command Center Triage Queue &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
