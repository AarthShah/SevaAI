import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Camera, Radio, Shield, CheckCircle2, RefreshCw,
  Play, Pause, Upload, MapPin, User, ArrowRight, Volume2, VolumeX,
  Video, FileVideo, FileImage, Activity
} from 'lucide-react';
import { cctvApi } from '../api/cctvApi';

const DEFAULT_CAMERAS = [
  { camera_id: 'CCTV-PN-01', location: 'Recorded road corridor sample', ward: 'Sample footage', video_url: '/sample_evidence/cctv_feed_1.mp4', status: 'RECORDED_SAMPLE' },
  { camera_id: 'CCTV-PN-02', location: 'Recorded street and public space sample', ward: 'Sample footage', video_url: '/sample_evidence/cctv_feed_2.mp4', status: 'RECORDED_SAMPLE' },
];

const UPLOAD_LOCATIONS = [
  { address: 'MG Road near College Main Gate, Pune', latitude: 18.52040, longitude: 73.85670 },
  { address: 'MG Road Market Corner, Pune', latitude: 18.52055, longitude: 73.85685 },
  { address: 'MG Road Transit Stop, Pune', latitude: 18.52070, longitude: 73.85700 },
  { address: 'Deccan Gymkhana Main Circle, Pune', latitude: 18.51800, longitude: 73.85200 },
  { address: 'Station Road Railway Overbridge, Pune', latitude: 18.52320, longitude: 73.86410 },
  { address: 'Paud Road, Kothrud, Pune', latitude: 18.50740, longitude: 73.80770 },
];

export const CCTVVisionPage = ({ isEmbedded = false }) => {
  const [cameras, setCameras] = useState(DEFAULT_CAMERAS);
  const [selectedCamera, setSelectedCamera] = useState(DEFAULT_CAMERAS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [dispatchedTicket, setDispatchedTicket] = useState(null);
  const [isDispatching, setIsDispatching] = useState(false);
  
  // Video player controls state
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [uploadedVideo, setUploadedVideo] = useState(null); // { name, url, size }
  const [uploadedImage, setUploadedImage] = useState(null); // { name, url, size, file }
  const [uploadLocation, setUploadLocation] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Clock tick for live CCTV OSD
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load actual recorded sample channels. No camera metadata is treated as a detection.
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const data = await cctvApi.getCameras();
        if (data && data.length > 0) {
          const merged = data.map((cam, idx) => ({ ...cam, location: cam.name || cam.location || 'Recorded CCTV sample', ward: cam.zone || 'Recorded sample', video_url: cam.video_url || DEFAULT_CAMERAS[idx % DEFAULT_CAMERAS.length].video_url }));
          setCameras(merged);
          setSelectedCamera(merged[0]);
          return;
        }
      } catch (err) {
        console.warn('Using standard municipal CCTV grid feeds', err);
      }
      setCameras(DEFAULT_CAMERAS);
      setSelectedCamera(DEFAULT_CAMERAS[0]);
    };
    loadCameras();
  }, []);

  // Handle Video Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setScanResult({ status: 'ERROR', detected_issue: 'Unsupported file', description: 'Choose a supported video file.' });
      e.target.value = '';
      return;
    }
    if (uploadedVideo?.url) URL.revokeObjectURL(uploadedVideo.url);
    if (uploadedImage?.url) URL.revokeObjectURL(uploadedImage.url);

    // Create a local blob URL for instant smooth video playback
    const videoUrl = URL.createObjectURL(file);
    const videoMeta = {
      name: file.name,
      url: videoUrl,
      size: (file.size / (1024 * 1024)).toFixed(1),
      type: file.type || 'video/mp4'
    };

    setUploadedVideo(videoMeta);
    setUploadedImage(null);
    setUploadLocation(UPLOAD_LOCATIONS[Math.floor(Math.random() * UPLOAD_LOCATIONS.length)]);
    setSelectedCamera(null); // Deselect preset camera
    setIsPlaying(true);

    setScanResult(null);
    setDispatchedTicket(null);
    e.target.value = '';
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setScanResult({ status: 'ERROR', detected_issue: 'Unsupported file', description: 'Choose a supported image file.' });
      e.target.value = '';
      return;
    }
    if (uploadedImage?.url) URL.revokeObjectURL(uploadedImage.url);
    if (uploadedVideo?.url) URL.revokeObjectURL(uploadedVideo.url);
    setUploadedImage({ name: file.name, url: URL.createObjectURL(file), size: (file.size / (1024 * 1024)).toFixed(1), file });
    setUploadLocation(UPLOAD_LOCATIONS[Math.floor(Math.random() * UPLOAD_LOCATIONS.length)]);
    setUploadedVideo(null);
    setSelectedCamera(null);
    setScanResult(null);
    setDispatchedTicket(null);
    e.target.value = '';
  };

  useEffect(() => () => {
    if (uploadedVideo?.url) URL.revokeObjectURL(uploadedVideo.url);
    if (uploadedImage?.url) URL.revokeObjectURL(uploadedImage.url);
  }, [uploadedVideo?.url, uploadedImage?.url]);

  const captureFrames = async () => {
    const video = videoRef.current;
    if (!video) throw new Error('Video player is not ready.');
    if (video.readyState < 2) await new Promise((resolve, reject) => {
      video.addEventListener('loadeddata', resolve, { once: true });
      video.addEventListener('error', () => reject(new Error('The video could not be read by this browser.')), { once: true });
    });
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!duration) throw new Error('This clip has no seekable duration.');
    const wasPaused = video.paused;
    const originalTime = video.currentTime;
    video.pause();
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1280 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    const frames = [];
    try {
      for (const fraction of [0.15, 0.5, 0.85]) {
        const target = Math.min(Math.max(0, duration * fraction), Math.max(0, duration - 0.1));
        if (Math.abs(video.currentTime - target) > 0.01) {
          video.currentTime = target;
          await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timed out while seeking the video.')), 5000);
            video.addEventListener('seeked', () => { clearTimeout(timer); resolve(); }, { once: true });
          });
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
        if (blob) frames.push(new File([blob], `frame-${Math.round(fraction * 100)}.jpg`, { type: 'image/jpeg' }));
      }
    } finally {
      video.currentTime = originalTime;
      if (!wasPaused) video.play().catch(() => {});
    }
    if (!frames.length) throw new Error('Could not extract frames from this clip.');
    return frames;
  };

  // Run scan on camera
  const runScan = async (cam = selectedCamera) => {
    if (!cam && !uploadedVideo && !uploadedImage) return;
    setIsScanning(true);
    setScanResult(null);
    setDispatchedTicket(null);
    try {
      const frames = uploadedImage ? [uploadedImage.file] : await captureFrames();
      const res = await cctvApi.scanFeed(cam?.camera_id, frames);
      setScanResult({
        ...res,
        location: cam?.address || cam?.location || uploadLocation?.address || 'Uploaded evidence',
        latitude: cam?.latitude ?? uploadLocation?.latitude,
        longitude: cam?.longitude ?? uploadLocation?.longitude,
      });
    } catch (err) {
      setScanResult({ status: 'ERROR', has_defect: null, detected_issue: 'Scan failed', description: err?.response?.data?.detail || err.message || 'Could not analyze this video.' });
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
        defect_type: detection.detected_issue,
        severity: detection.severity,
        confidence: detection.confidence || 0,
        description: detection.description,
        latitude: selectedCamera?.latitude ?? detection.latitude,
        longitude: selectedCamera?.longitude ?? detection.longitude,
        address: selectedCamera?.address || detection.location
      };
      const res = await cctvApi.autoDispatch(payload);
      setDispatchedTicket(res);
    } catch (err) {
      setScanResult((previous) => ({ ...previous, dispatch_error: err?.response?.data?.detail || 'Dispatch failed. Confirm the camera location and try again.' }));
    } finally {
      setIsDispatching(false);
    }
  };

  // Toggle video play / pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Active video source
  const currentVideoSrc = uploadedVideo 
    ? uploadedVideo.url 
    : (selectedCamera?.video_url || '/sample_evidence/cctv_feed_1.mp4');

  const currentCoords = uploadLocation?.address || selectedCamera?.address || 'Location not configured';

  const supportedUploadIssue = scanResult && /garbage|waste|water|leak|pothole|road|drain/i.test(scanResult.detected_issue || '');

  const currentCamName = uploadedVideo 
    ? `Uploaded: ${uploadedVideo.name}` 
    : (selectedCamera ? `${selectedCamera.camera_id} (${selectedCamera.location})` : 'CCTV-PN-01');

  return (
    <div className={isEmbedded ? "space-y-6" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-white min-h-[calc(100vh-64px)]"}>
      {/* Hidden Video Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/avi"
        className="hidden"
      />
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageUpload}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* Breadcrumb */}
      {!isEmbedded && (
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Link to="/" className="hover:text-slate-600">Home</Link>
          <span>&rsaquo;</span>
          <Link to="/authority" className="hover:text-slate-600">Command Center</Link>
          <span>&rsaquo;</span>
          <span className="text-slate-700 font-medium">CCTV AI Vision Grid</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-md p-5 border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
            <Radio className="w-3.5 h-3.5 text-blue-800" />
            <span>Recorded footage analysis</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            CCTV AI Defect Scanner & Surveillance Grid
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Analyze recorded footage or an authorized CCTV clip for visible potholes, waste, water, drainage, and street hazards.
          </p>
        </div>

      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: recorded or uploaded CCTV clip */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-md border border-slate-200 p-3 sm:p-4 shadow-xs space-y-3">
            {/* Monitor Top Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span className="font-bold text-slate-600 text-xs tracking-wider">RECORDED CLIP</span>
                <span className="text-slate-300">|</span>
                <span className="font-bold text-slate-900 font-mono truncate max-w-[220px] sm:max-w-none">
                  {uploadedVideo ? `FILE: ${uploadedVideo.name}` : (selectedCamera ? selectedCamera.camera_id : 'CCTV-PN-01')}
                </span>
                {!uploadedVideo && selectedCamera && (
                  <span className="text-slate-400 hidden sm:inline truncate max-w-[200px]">
                    &bull; {selectedCamera.location}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {uploadedVideo && (
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedVideo(null);
                      setUploadedImage(null);
                      setUploadLocation(null);
                      setSelectedCamera(cameras[0]);
                      setScanResult(null);
                    }}
                    className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 transition"
                  >
                    Reset to City Grid
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    runScan();
                  }}
                  disabled={isScanning}
                  className="px-3 py-1 rounded bg-blue-800 hover:bg-blue-900 text-white font-medium text-xs transition flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>{isScanning ? (uploadedImage ? 'Analyzing image...' : 'Analyzing frames...') : (uploadedImage ? 'Analyze image' : 'Analyze clip')}</span>
                </button>
              </div>
            </div>

            {/* Video Viewport with Live CCTV HUD */}
            <div className="relative rounded overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800 select-none group">
              {uploadedImage ? (
                <img src={uploadedImage.url} alt={`Uploaded evidence ${uploadedImage.name}`} className="w-full h-full object-contain" />
              ) : (
                <video
                  key={currentVideoSrc}
                  ref={videoRef}
                  src={currentVideoSrc}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-cover"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              )}

              {/* Scanning Laser Sweep Animation */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-[bounce_1.5s_infinite]"></div>
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded bg-slate-900/90 text-cyan-400 border border-cyan-500/50 text-xs font-mono font-bold flex items-center gap-2 shadow-lg backdrop-blur-xs">
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                    <span>Sampling video frames for vision analysis...</span>
                  </div>
                </div>
              )}

              {/* CCTV OSD Top HUD */}
            <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px] font-mono pointer-events-none drop-shadow-md">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="font-bold text-slate-200">{uploadedImage ? 'IMAGE REVIEW' : 'PLAYBACK'}</span>
                  <span>{currentCamName}</span>
                </div>
                <div className="bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded border border-white/10 font-bold tracking-wider text-slate-200">
                  {currentTime} IST
                </div>
              </div>

              {/* CCTV OSD Bottom HUD */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[10px] font-mono pointer-events-none drop-shadow-md">
                <div className="bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded border border-white/10 text-slate-300">Location: {currentCoords}</div>
                <div className="bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded border border-white/10 text-slate-300 font-semibold">{uploadedImage ? 'Uploaded image' : 'Recorded video'}</div>
              </div>

              {/* Player Floating Quick Controls */}
              <div className="absolute bottom-10 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-xs p-1 rounded-md border border-white/20 transition opacity-90 hover:opacity-100">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1.5 text-white hover:text-blue-400 rounded transition"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 text-white hover:text-blue-400 rounded transition"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Uploaded Video Banner Notice if present */}
            {uploadedVideo && (
              <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded text-xs">
                <div className="flex items-center gap-2 text-blue-900">
                  <FileVideo className="w-4 h-4 text-blue-700" />
                  <span>
                    Uploaded Surveillance Clip: <strong>{uploadedVideo.name}</strong> ({uploadedVideo.size} MB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-800 font-semibold hover:underline"
                >
                  Change Video
                </button>
              </div>
            )}

            {uploadedImage && (
              <div className="flex items-center justify-between p-2.5 bg-sky-50 border border-sky-200 rounded text-xs">
                <div className="flex items-center gap-2 text-sky-900">
                  <FileImage className="w-4 h-4 text-sky-700" />
                  <span>Uploaded Evidence Image: <strong>{uploadedImage.name}</strong> ({uploadedImage.size} MB)</span>
                </div>
                <button type="button" onClick={() => { setUploadedImage(null); setUploadLocation(null); setSelectedCamera(cameras[0]); setScanResult(null); }} className="text-sky-800 font-semibold hover:underline">Change Image</button>
              </div>
            )}

            {/* Scan Status & AI Defect Report */}
            {scanResult && (
              scanResult.status === 'ERROR' || scanResult.status === 'NEEDS_REVIEW' ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-md text-xs space-y-2">
                  <strong className="text-amber-950 font-bold text-sm">{scanResult.status === 'ERROR' ? 'Analysis unavailable' : 'Manual review required'}</strong>
                  <p className="text-amber-900 leading-relaxed">{scanResult.description}</p>
                </div>
              ) : scanResult.has_defect === false || scanResult.status === 'NOMINAL' ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <strong className="text-emerald-950 font-bold text-sm">
                        No supported defect found in sampled frames
                      </strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-800 text-white font-mono text-[10px] font-bold">
                        Confidence: {Math.round((scanResult.confidence || 0) * 100)}%
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ALL CLEAR
                      </span>
                    </div>
                  </div>

                  <p className="text-emerald-900 text-xs leading-relaxed">
                    {scanResult.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200 text-xs">
                    <span className="text-emerald-800">
                    Frames analyzed: <strong>{scanResult.frames_analyzed || 0}</strong>
                    </span>
                    <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>No Work Order Required</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-600"></span>
                      <strong className="text-slate-900 font-bold text-sm">
                        Defect Identified: {scanResult.detected_issue}
                      </strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-800 text-white font-mono text-[10px] font-bold">
                        Confidence: {Math.round((scanResult.confidence || 0) * 100)}%
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        scanResult.severity === 'CRITICAL' 
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {scanResult.severity || 'HIGH'} PRIORITY
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed">
                    {scanResult.description}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                    <div><span className="block text-[10px] uppercase text-slate-400 font-bold">Issue</span><strong className="text-slate-900">{scanResult.detected_issue || 'Review required'}</strong></div>
                    <div><span className="block text-[10px] uppercase text-slate-400 font-bold">Department</span><strong className="text-slate-900">{scanResult.suggested_department || 'Needs review'}</strong></div>
                    <div><span className="block text-[10px] uppercase text-slate-400 font-bold">Severity</span><strong className="text-slate-900">{scanResult.severity || 'Needs review'}</strong></div>
                    <div><span className="block text-[10px] uppercase text-slate-400 font-bold">Confidence</span><strong className="text-slate-900">{Math.round((scanResult.confidence || 0) * 100)}%</strong></div>
                  </div>
                  <div className="flex items-start gap-2 rounded bg-amber-50 border border-amber-200 p-2 text-amber-900">
                    <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-700" />
                    <span><strong>Human verification:</strong> an operator confirms the image, location, and suggested department before any work order is created.</span>
                  </div>
                  {supportedUploadIssue && (uploadedImage || uploadedVideo) && (
                    <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-emerald-950">
                      <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="w-4 h-4 text-emerald-700" /> Analysis complete</div>
                      <p className="mt-1">This uploaded evidence contains a supported civic issue. A complete record has been prepared for human verification.</p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                        <span><strong>Address:</strong> {scanResult.location}</span>
                        <span><strong>Source:</strong> {uploadedImage ? 'Uploaded image' : 'Uploaded video frames'}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs">
                    <span className="text-slate-700">
                      Suggested department: <strong className="text-slate-900">{scanResult.suggested_department || 'Needs review'}</strong>
                    </span>
                    <span className="text-slate-500">{scanResult.frames_with_issue || 0} of {scanResult.frames_analyzed || 0} sampled frames flagged</span>
                    {scanResult.dispatch_error && <span role="alert" className="text-rose-700">{scanResult.dispatch_error}</span>}
                    {scanResult.has_defect && scanResult.confidence >= 0.65 && scanResult.location && (selectedCamera?.address || uploadLocation?.address) && (selectedCamera?.latitude ?? uploadLocation?.latitude) != null && (selectedCamera?.longitude ?? uploadLocation?.longitude) != null && (
                      <button type="button" onClick={() => handleAutoDispatch(scanResult)} disabled={isDispatching}
                        className="px-3 py-1 bg-blue-800 hover:bg-blue-900 text-white font-semibold rounded transition flex items-center gap-1.5 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isDispatching ? 'Creating work order...' : 'Confirm and create work order'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Column: Channels & Dispatched Work Orders (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Upload Dedicated Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-blue-800" />
                <span>Custom Video Scanner</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">MP4, WEBM, MOV</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Upload a video you are authorized to use. The browser samples three frames and sends them to the configured vision service for review.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded text-xs transition flex items-center justify-center gap-2 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-blue-800" />
              <span>Select Video File</span>
            </button>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded text-xs transition flex items-center justify-center gap-2 shadow-xs"
            >
              <FileImage className="w-3.5 h-3.5 text-sky-700" />
              <span>Upload Image Evidence</span>
            </button>
            <p className="text-slate-500 text-[11px]">One still frame uses the same civic vision analysis and returns an AI decision for human confirmation.</p>
          </div>

          {/* Smart City Camera Channels */}
          <div className="bg-white rounded-md border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Smart City Camera Channels
              </h2>
              <span className="text-[11px] text-slate-600 font-semibold">{cameras.length} Recorded samples</span>
            </div>

            <div className="space-y-2">
              {cameras.map((cam) => {
                const isSelected = !uploadedVideo && selectedCamera?.camera_id === cam.camera_id;
                return (
                  <div
                    key={cam.camera_id}
                    onClick={() => {
                      setUploadedVideo(null);
                      setSelectedCamera(cam); 
                      setScanResult(null);
                    }}
                    className={`p-2.5 rounded border cursor-pointer transition flex items-center gap-3 ${
                      isSelected
                        ? 'bg-blue-50 border-blue-700 ring-1 ring-blue-700'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative w-12 h-10 rounded overflow-hidden flex-shrink-0 border border-slate-200 bg-slate-900">
                      <Video className="w-full h-full p-2 text-slate-300" aria-label="Recorded clip" />
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-slate-400 m-0.5"></span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-slate-900 block truncate">{cam.camera_id}</strong>
                        <span className="text-[10px] text-slate-500 font-mono">{cam.ward?.split(' ')[0]}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">{cam.location}</span>
                      <span className="text-[10px] text-blue-800 font-medium block truncate mt-0.5">{cam.status === 'RECORDED_SAMPLE' ? 'Recorded video sample' : 'Video source'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Autonomous Dispatched Ticket Card */}
          {dispatchedTicket && (
            <div className="bg-white rounded-md border border-emerald-300 p-4 shadow-xs space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Work Order Created</span>
                </span>
                <span className="font-mono font-bold text-emerald-800">
                  #{dispatchedTicket.ticket_id || dispatchedTicket.complaint_id || 'Created'}
                </span>
              </div>
              <div className="space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Department:</span>
                  <span className="font-semibold text-slate-900">{dispatchedTicket.department || 'Road Department'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Squad Assigned:</span>
                  <span className="font-semibold text-blue-900">{dispatchedTicket.officer || dispatchedTicket.assigned_officer?.name || 'Pending assignment'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Arrival:</span>
                  <span className="font-mono font-bold text-slate-800">{dispatchedTicket.eta_minutes || dispatchedTicket.assigned_officer?.eta_minutes || 'Pending'}</span>
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
