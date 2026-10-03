import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, Radio, Shield, AlertTriangle, CheckCircle2, RefreshCw,
  Play, Pause, Upload, Volume2, VolumeX, Cpu, Zap, Activity, XCircle
} from 'lucide-react';
import { cctvApi } from '../api/cctvApi';

const DEFAULT_CAMERAS = [
  { camera_id: 'CCTV-PN-01', location: 'MG Road Arterial Corridor', zone: 'Central Ward', video_url: '/sample_evidence/cctv_feed_1.mp4', sample_snapshot: '/sample_evidence/pothole.jpg', status: 'LIVE_MONITORING' },
  { camera_id: 'CCTV-PN-02', location: 'Central Market Promenade', zone: 'Market Yard', video_url: '/sample_evidence/cctv_feed_2.mp4', sample_snapshot: '/sample_evidence/garbage.jpg', status: 'LIVE_MONITORING' },
  { camera_id: 'CCTV-PN-03', location: 'Shivajinagar Junction (Test)', zone: 'Deccan Corridor', video_url: '/sample_evidence/cctv_feed_1.mp4', sample_snapshot: '/sample_evidence/pothole.jpg', status: 'TEST_FEED' },
  { camera_id: 'CCTV-PN-04', location: 'Mandai Market (Test)', zone: 'Market Yard', video_url: '/sample_evidence/cctv_feed_2.mp4', sample_snapshot: '/sample_evidence/garbage.jpg', status: 'TEST_FEED' },
  { camera_id: 'CCTV-PN-05', location: 'Riverbank Pipeline Hub (Test)', zone: 'Utility Corridor', video_url: '/sample_evidence/cctv_feed_1.mp4', sample_snapshot: '/sample_evidence/pothole.jpg', status: 'TEST_FEED' },
  { camera_id: 'CCTV-PN-06', location: 'Smart City Safe Corridor', zone: 'Central Ward', video_url: '/sample_evidence/cctv_feed_1.mp4', sample_snapshot: '/sample_evidence/pothole.jpg', status: 'LIVE_MONITORING' },
];

const SEV_CLS = { HIGH: 'text-red-700 bg-red-50 border-red-300', MEDIUM: 'text-amber-700 bg-amber-50 border-amber-300', LOW: 'text-blue-700 bg-blue-50 border-blue-300', NONE: 'text-emerald-700 bg-emerald-50 border-emerald-300', CRITICAL: 'text-red-900 bg-red-100 border-red-500' };
export const CCTVVisionPage = ({ isEmbedded = false }) => {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const rafRef = useRef(null);
  const [cameras, setCameras] = useState(DEFAULT_CAMERAS);
  const [selectedCam, setSelectedCam] = useState(DEFAULT_CAMERAS[0]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [clockStr, setClockStr] = useState(new Date().toLocaleTimeString());
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [yoloTelemetry, setYoloTelemetry] = useState(null);
  const [frameDets, setFrameDets] = useState([]);
  const [stats, setStats] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [cctvEvents, setCctvEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [previewEvent, setPreviewEvent] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);

  useEffect(() => { const t = setInterval(() => setClockStr(new Date().toLocaleTimeString()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    cctvApi.getCameras().then(data => {
      if (data && data.length) {
        const merged = data.map((c, i) => ({ ...c, video_url: c.video_url || DEFAULT_CAMERAS[i % DEFAULT_CAMERAS.length].video_url }));
        setCameras(merged); setSelectedCam(merged[0]);
      }
    }).catch(() => {});
  }, []);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const params = filterStatus !== 'ALL' ? { status: filterStatus } : {};
      const data = await cctvApi.getEvents(params);
      setCctvEvents(data.items || []);
    } catch (_) {} finally { setEventsLoading(false); }
  }, [filterStatus]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const doReview = async (id, status) => {
    setActionBusy(id); setActionMsg(null);
    try { await cctvApi.updateEventStatus(id, { status, review_notes: 'Officer review' }); setActionMsg({ ok: true, text: 'Event ' + id + ' marked ' + status }); await fetchEvents(); }
    catch (e) { setActionMsg({ ok: false, text: 'Failed: ' + e.message }); } finally { setActionBusy(null); }
  };
  const doConvert = async (id) => {
    setActionBusy(id); setActionMsg(null);
    try { const r = await cctvApi.convertToComplaint(id); setActionMsg({ ok: true, text: 'Converted to Complaint #' + r.complaint_id }); await fetchEvents(); }
    catch (e) { setActionMsg({ ok: false, text: 'Failed: ' + e.message }); } finally { setActionBusy(null); }
  };

  const syncBoxes = useCallback(() => {
    if (!yoloTelemetry || !videoRef.current) return;
    const fps = (yoloTelemetry.metadata && yoloTelemetry.metadata.fps) || 30;
    const fi = Math.round(videoRef.current.currentTime * fps);
    const fd = yoloTelemetry.frames && yoloTelemetry.frames.find(f => Math.abs(f.frame_idx - fi) <= 1);
    setFrameDets((fd && fd.detections) || []);
    rafRef.current = requestAnimationFrame(syncBoxes);
  }, [yoloTelemetry]);
  useEffect(() => {
    if (yoloTelemetry && videoRef.current && !videoRef.current.paused) rafRef.current = requestAnimationFrame(syncBoxes);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [yoloTelemetry, syncBoxes]);

  const handleUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setUploadedVideo({ name: file.name, url: localUrl, size: (file.size / 1048576).toFixed(1) });
    setSelectedCam(null); setIsPlaying(true); setYoloTelemetry(null); setFrameDets([]); setScanResult(null); setStats(null);
    setProcessing(true); setProgress(0);
    const tick = setInterval(() => setProgress(p => Math.min(p + 1.5, 90)), 400);
    try {
      const tel = await cctvApi.processVideo(file, 'CAM-UPLOAD-AI', 0.25, true);
      clearInterval(tick); setProgress(100); setYoloTelemetry(tel);
      if (tel.annotated_video_url) setUploadedVideo(prev => ({ ...prev, annotatedUrl: tel.annotated_video_url }));
      const allDets = (tel.frames || []).reduce((a, f) => a.concat(f.detections || []), []);
      const confirmed = tel.confirmed_events || [];
      setStats({ fps: tel.metadata && tel.metadata.overall_fps, lat: tel.metadata && tel.metadata.avg_latency_ms, vram: tel.metadata && tel.metadata.peak_vram_mb, frames: tel.metadata && tel.metadata.total_frames, rawDets: tel.stats && tel.stats.total_raw_detections, confDets: tel.stats && tel.stats.total_confirmed_events, res: ((tel.metadata && tel.metadata.width) || '?') + 'x' + ((tel.metadata && tel.metadata.height) || '?') });
      if (allDets.length > 0) {
        const peak = allDets.reduce((b, d) => d.confidence > (b ? b.confidence : 0) ? d : b, allDets[0]);
        setScanResult({ status: 'DEFECT_DETECTED', has_defect: true, issue: peak.issue_type, conf: peak.confidence, sev: peak.confidence > 0.65 ? 'HIGH' : peak.confidence > 0.40 ? 'MEDIUM' : 'LOW', totalRaw: allDets.length, totalConf: confirmed.length, dets: allDets, confirmed });
      } else {
        setScanResult({ status: 'NOMINAL', has_defect: false, issue: 'Normal — Zero Defects Detected', conf: 0, sev: 'NONE', totalRaw: 0, totalConf: 0, dets: [], confirmed: [] });
      }
    } catch (err) { clearInterval(tick); console.error('YOLO error:', err); setScanResult({ status: 'ERROR', has_defect: false, issue: 'AI Inference Error' }); }
    finally { setProcessing(false); setTimeout(() => setProgress(0), 800); }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); if (yoloTelemetry) rafRef.current = requestAnimationFrame(syncBoxes); }
    else { videoRef.current.pause(); setIsPlaying(false); if (rafRef.current) cancelAnimationFrame(rafRef.current); }
  };
  const toggleMute = () => { if (!videoRef.current) return; videoRef.current.muted = !isMuted; setIsMuted(!isMuted); };

  const videoSrc = (uploadedVideo && (uploadedVideo.annotatedUrl || uploadedVideo.url)) || (selectedCam && selectedCam.video_url) || '/sample_evidence/cctv_feed_1.mp4';
  const camLabel = uploadedVideo ? 'Uploaded: ' + uploadedVideo.name : selectedCam ? selectedCam.camera_id + ' — ' + (selectedCam.zone || '') : 'CCTV-PN-01';

  return (
    <div className={isEmbedded ? 'space-y-6' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6'}>
      <input type='file' ref={fileInputRef} onChange={handleUpload} accept='video/mp4,video/webm,video/quicktime,video/avi' className='hidden' />

      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-xl p-5 border border-slate-200 shadow-sm'>
        <div className='space-y-1'>
          <div className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200'>
            <Radio className='w-3.5 h-3.5 text-blue-700 animate-pulse' />
            <span>Smart City Edge Vision Grid — YOLO11s V2 Real-Time Inference</span>
          </div>
          <h1 className='text-xl sm:text-2xl font-bold text-slate-900'>CCTV AI Vision — Real-Time Road Defect Detection</h1>
          <p className='text-xs text-slate-500'>Upload any surveillance video. YOLO11s V2 runs real frame-by-frame inference — zero hardcoded results.</p>
        </div>
        <div className='flex flex-wrap items-center gap-2.5'>
          <button onClick={() => fileInputRef.current && fileInputRef.current.click()} className='inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold transition shadow'>
            <Upload className='w-4 h-4' /><span>Upload Video for AI Analysis</span>
          </button>
          <button onClick={fetchEvents} className='inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm transition'>
            <RefreshCw className='w-3.5 h-3.5' /><span>Refresh Events</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Video Player (2 cols) */}
        <div className='lg:col-span-2 space-y-4'>
          <div className='relative bg-black rounded-xl overflow-hidden shadow-xl aspect-video group'>
            <video ref={videoRef} key={videoSrc} src={videoSrc} autoPlay={isPlaying} muted={isMuted} loop playsInline className='w-full h-full object-contain bg-black'
              onPlay={() => { setIsPlaying(true); if (yoloTelemetry) rafRef.current = requestAnimationFrame(syncBoxes); }}
              onPause={() => { setIsPlaying(false); if (rafRef.current) cancelAnimationFrame(rafRef.current); }} />

            {/* YOLO Bounding Boxes */}
            {frameDets.length > 0 && yoloTelemetry && (
              <div className='absolute inset-0 pointer-events-none'>
                {frameDets.map((det, i) => {
                  const bb = det.bbox || [0,0,0,0];
                  const W = (yoloTelemetry.metadata && yoloTelemetry.metadata.width) || 640;
                  const H = (yoloTelemetry.metadata && yoloTelemetry.metadata.height) || 480;
                  const style = { left: (bb[0]/W*100).toFixed(2)+'%', top: (bb[1]/H*100).toFixed(2)+'%', width: ((bb[2]-bb[0])/W*100).toFixed(2)+'%', height: ((bb[3]-bb[1])/H*100).toFixed(2)+'%' };
                  const pct = Math.round((det.confidence||0)*100);
                  const conf = det.is_confirmed;
                  return (
                    <div key={i} className='absolute' style={style}>
                      <div className={'w-full h-full border-2 rounded-sm ' + (conf ? 'border-red-500 bg-red-500/10' : 'border-amber-400 bg-amber-400/10')} />
                      <div className={'absolute -top-6 left-0 px-1.5 py-0.5 rounded text-[10px] font-bold text-white ' + (conf ? 'bg-red-600' : 'bg-amber-600')}>
                        {det.issue_type || 'POTHOLE'} {pct}%{conf && <span className='ml-0.5 text-[8px]'>C</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Processing overlay */}
            {processing && (
              <div className='absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-4 z-20'>
                <div className='flex items-center gap-3 text-white'>
                  <Cpu className='w-7 h-7 text-blue-400 animate-spin' />
                  <div><p className='text-base font-bold'>YOLO11s V2 Processing...</p><p className='text-xs text-slate-400'>Real frame-by-frame inference on GPU</p></div>
                </div>
                <div className='w-64 bg-white/10 rounded-full h-2'><div className='bg-blue-400 h-2 rounded-full transition-all duration-300' style={{ width: progress + '%' }} /></div>
                <p className='text-xs text-blue-300 font-mono'>{Math.round(progress)}% complete...</p>
              </div>
            )}

            {/* OSD HUD top */}
            <div className='absolute top-2 left-3 right-3 flex items-center justify-between pointer-events-none z-10'>
              <div className='flex items-center gap-2 bg-black/70 px-2.5 py-1 rounded border border-white/10 text-white text-[11px]'>
                <span className='w-1.5 h-1.5 rounded-full bg-red-500 animate-ping' />
                <span className='font-bold text-red-400'>REC</span>
                <span className='text-slate-300'>{camLabel}</span>
                {stats && <span className='text-emerald-400 font-mono ml-2'>YOLO11s V2 • {stats.fps ? stats.fps.toFixed(1) : '--'} FPS</span>}
              </div>
              <div className='bg-black/70 px-2.5 py-1 rounded border border-white/10 text-white text-[11px] font-mono'>{clockStr} IST</div>
            </div>

            {/* OSD HUD bottom */}
            <div className='absolute bottom-10 left-3 right-3 flex items-center justify-between pointer-events-none z-10'>
              <div className='bg-black/70 px-2 py-0.5 rounded border border-white/10 text-slate-300 text-[10px]'>
                {frameDets.length > 0 ? frameDets.length + ' ACTIVE DETECTION' + (frameDets.length > 1 ? 'S' : '') : 'Scanning frame...'}
              </div>
              {stats && <div className='bg-black/70 px-2 py-0.5 rounded border border-white/10 text-emerald-400 text-[10px] font-mono'>{stats.res} | {stats.lat ? stats.lat.toFixed(0) : '--'}ms | {stats.vram ? stats.vram.toFixed(0) : '--'}MB VRAM</div>}
            </div>

            {/* Controls */}
            <div className='absolute bottom-2 right-3 flex gap-1.5 bg-black/70 p-1 rounded z-10 opacity-0 group-hover:opacity-100 transition-opacity'>
              <button onClick={togglePlay} className='p-1.5 text-white hover:text-blue-400'>{isPlaying ? <Pause className='w-3.5 h-3.5' /> : <Play className='w-3.5 h-3.5' />}</button>
              <button onClick={toggleMute} className='p-1.5 text-white hover:text-blue-400'>{isMuted ? <VolumeX className='w-3.5 h-3.5' /> : <Volume2 className='w-3.5 h-3.5' />}</button>
            </div>
          </div>

          {/* Inference Result */}
          {scanResult && !processing && (
            <div className={'p-4 rounded-xl border ' + (scanResult.status === 'NOMINAL' ? 'bg-emerald-50 border-emerald-200' : scanResult.status === 'ERROR' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200')}>
              <div className='flex items-center justify-between gap-2 mb-2'>
                <div className='flex items-center gap-2'>
                  {scanResult.status === 'NOMINAL' ? <CheckCircle2 className='w-5 h-5 text-emerald-600' /> : <AlertTriangle className='w-5 h-5 text-amber-600' />}
                  <span className='font-bold text-slate-900 text-sm'>{scanResult.status === 'NOMINAL' ? 'YOLO11s V2: No Defects Detected' : scanResult.status === 'ERROR' ? 'Inference Error' : 'YOLO11s V2: ' + scanResult.issue + ' Detected'}</span>
                </div>
                {scanResult.has_defect && <span className={'px-2 py-0.5 rounded text-[11px] font-bold border ' + (SEV_CLS[scanResult.sev] || SEV_CLS.MEDIUM)}>{scanResult.sev}</span>}
              </div>
              {scanResult.has_defect && (
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2'>
                  {[['Peak Conf', Math.round((scanResult.conf||0)*100)+'%', 'amber'],['Raw Dets', scanResult.totalRaw||0, 'slate'],['Confirmed', scanResult.totalConf||0, 'blue'],['FPS', stats && stats.fps ? stats.fps.toFixed(1) : '-', 'emerald']].map(([l,v,c]) => (
                    <div key={l} className='bg-white rounded-lg p-2 border border-amber-200 text-center'>
                      <div className='text-[10px] text-slate-500 uppercase font-semibold'>{l}</div>
                      <div className={'text-lg font-bold text-'+c+'-700'}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              {stats && <p className='mt-2 text-xs text-slate-500 font-mono bg-white/60 rounded px-2 py-1 border'>YOLO11s V2-Production | {stats.res} | {stats.frames} frames | {stats.lat ? stats.lat.toFixed(0) : '--'}ms | {stats.vram ? stats.vram.toFixed(0) : '--'}MB VRAM</p>}
            </div>
          )}

          {/* Camera Grid */}
          <div className='bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden'>
            <div className='px-4 py-3 border-b border-slate-100 flex items-center justify-between'>
              <h3 className='text-sm font-bold text-slate-800 flex items-center gap-1.5'><Camera className='w-4 h-4 text-blue-600' /> Municipal CCTV Grid</h3>
              <span className='text-xs text-slate-500'>{cameras.length} cameras</span>
            </div>
            <div className='grid grid-cols-3 sm:grid-cols-6 gap-2 p-3'>
              {cameras.map(cam => {
                const isSel = selectedCam && selectedCam.camera_id === cam.camera_id && !uploadedVideo;
                return (
                  <div key={cam.camera_id} onClick={() => { setSelectedCam(cam); setUploadedVideo(null); setScanResult(null); setYoloTelemetry(null); setFrameDets([]); setStats(null); }} className={'relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all ' + (isSel ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-400')}>
                    <img src={cam.sample_snapshot || '/sample_evidence/pothole.jpg'} alt={cam.location} className='w-full h-16 object-cover' onError={e => { e.target.onerror=null; e.target.src='/sample_evidence/pothole.jpg'; }} />
                    <div className='absolute inset-0 bg-gradient-to-t from-black/70 to-transparent' />
                    <div className='absolute bottom-0.5 left-1 right-1'>
                      <p className='text-white text-[8px] font-bold truncate'>{cam.camera_id}</p>
                      <p className={'text-[7px] ' + (cam.status === 'LIVE_MONITORING' ? 'text-emerald-400' : 'text-amber-400')}>{cam.status === 'LIVE_MONITORING' ? '● LIVE' : '● TEST'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className='space-y-4'>
          <div className='bg-gradient-to-br from-blue-900 to-slate-900 rounded-xl p-4 border border-blue-800/40'>
            <div className='flex items-center gap-2 mb-2'><Zap className='w-4 h-4 text-blue-400' /><span className='text-white font-bold text-sm'>Real-Time YOLO11s V2</span></div>
            <p className='text-blue-200 text-xs mb-3'>Upload any road/CCTV video. Real frame-by-frame pothole detection — zero hardcoded results, zero mocks.</p>
            <button onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={processing} className='w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2'>
              {processing ? <><Cpu className='w-4 h-4 animate-spin' /> YOLO Running... {Math.round(progress)}%</> : <><Upload className='w-4 h-4' /> Upload Video for AI Scan</>}
            </button>
          </div>

          <div className='bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden'>
            <div className='px-4 py-3 border-b border-slate-100 flex items-center justify-between'>
              <h3 className='text-sm font-bold text-slate-800 flex items-center gap-1.5'><Activity className='w-4 h-4 text-amber-500' /> Live Frame Detections</h3>
              <span className='text-[11px] text-slate-500 font-mono bg-slate-50 px-1.5 py-0.5 rounded border'>{frameDets.length} active</span>
            </div>
            <div className='divide-y divide-slate-100 max-h-64 overflow-y-auto'>
              {frameDets.length > 0 ? frameDets.map((det, i) => {
                const pct = Math.round((det.confidence||0)*100);
                return (
                  <div key={i} className='px-4 py-2.5 flex items-center justify-between gap-2'>
                    <div>
                      <div className='flex items-center gap-1.5'>
                        <span className={'w-1.5 h-1.5 rounded-full ' + (det.is_confirmed ? 'bg-red-500' : 'bg-amber-400')} />
                        <span className='text-xs font-bold text-slate-800'>{det.issue_type || 'POTHOLE'}</span>
                        {det.is_confirmed && <span className='text-[9px] bg-red-100 text-red-700 border border-red-200 px-1 rounded font-bold'>CONFIRMED</span>}
                      </div>
                      {det.track_id >= 0 && <p className='text-[10px] text-slate-400 font-mono'>Track #{det.track_id}</p>}
                    </div>
                    <span className={'text-sm font-bold font-mono ' + (pct > 60 ? 'text-red-600' : pct > 40 ? 'text-amber-600' : 'text-blue-600')}>{pct}%</span>
                  </div>
                );
              }) : <div className='px-4 py-6 text-center text-slate-400 text-xs'>{yoloTelemetry ? 'No detections in current frame' : uploadedVideo ? (processing ? 'YOLO11s V2 processing...' : 'Play video to see live detections') : 'Upload a video to see real YOLO detections'}</div>}
            </div>
          </div>

          {scanResult && scanResult.confirmed && scanResult.confirmed.length > 0 && (
            <div className='bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden'>
              <div className='px-4 py-3 border-b border-red-100 bg-red-50'>
                <h3 className='text-sm font-bold text-red-800 flex items-center gap-1.5'><Shield className='w-4 h-4 text-red-600' /> {scanResult.confirmed.length} Confirmed Events</h3>
              </div>
              <div className='divide-y divide-slate-100 max-h-48 overflow-y-auto'>
                {scanResult.confirmed.slice(0,5).map((ev,i) => (
                  <div key={i} className='px-4 py-2.5'>
                    <div className='flex items-center justify-between'><span className='text-xs font-bold text-red-700'>{ev.event_type}</span><span className='text-xs font-mono'>{Math.round((ev.confidence||0)*100)}%</span></div>
                    <p className='text-[10px] text-slate-400 font-mono'>Track #{ev.track_id} | Frame {ev.frame_number} | {ev.persistence_seconds ? ev.persistence_seconds.toFixed(2) : '?'}s</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats && (
            <div className='bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2'>
              <h3 className='text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5'><Cpu className='w-3.5 h-3.5 text-blue-600' /> YOLO11s V2 Performance</h3>
              {[['FPS', stats.fps ? stats.fps.toFixed(1) : '-'],['Latency', stats.lat ? stats.lat.toFixed(0)+' ms' : '-'],['Peak VRAM', stats.vram ? stats.vram.toFixed(0)+' MB' : '-'],['Resolution', stats.res],['Frames', stats.frames],['Raw Dets', stats.rawDets],['Confirmed', stats.confDets]].map(([l,v]) => (
                <div key={l} className='flex items-center justify-between text-xs'><span className='text-slate-500'>{l}</span><span className='font-mono font-bold text-slate-800'>{v}</span></div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Triage Table */}
      <div className='bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden'>
        <div className='px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-sm font-bold text-slate-900'>Confirmed Edge AI Events — Officer Triage Queue</h2>
            <p className='text-xs text-slate-500 mt-0.5'>CCTV AI events awaiting officer review and civic action.</p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            {['ALL','PENDING_REVIEW','VERIFIED','CONVERTED','DISMISSED'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={'px-2.5 py-1 rounded text-[11px] font-semibold border transition ' + (filterStatus === s ? 'bg-blue-800 text-white border-blue-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}>
                {s === 'ALL' ? 'All' : s.replace('_',' ')}
              </button>
            ))}
          </div>
        </div>
        {actionMsg && <div className={'mx-5 mt-3 p-2.5 rounded text-xs font-medium border ' + (actionMsg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800')}>{actionMsg.text}</div>}
        {eventsLoading ? (
          <div className='p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2'><RefreshCw className='w-4 h-4 animate-spin' /> Loading CCTV events...</div>
        ) : cctvEvents.length === 0 ? (
          <div className='p-8 text-center text-slate-400'><Shield className='w-8 h-8 mx-auto mb-2 text-slate-300' /><p className='text-sm font-medium'>No events in queue</p><p className='text-xs mt-1'>Process a video above to generate confirmed CCTV events.</p></div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-xs'>
              <thead className='bg-slate-50 border-b border-slate-200'>
                <tr>{['Evidence','Issue / Camera','Confidence','Severity','Status','Location','Actions'].map(h => <th key={h} className='px-4 py-2.5 text-left text-[10px] uppercase font-bold text-slate-500'>{h}</th>)}</tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {cctvEvents.map(evt => {
                  const id = evt.event_id || evt.id;
                  const pending = evt.status === 'PENDING_REVIEW';
                  const verified = evt.status === 'VERIFIED';
                  const busy = actionBusy === id;
                  return (
                    <tr key={id} className='hover:bg-slate-50 transition-colors'>
                      <td className='px-4 py-3'>
                        {evt.evidence_image_url ? <img src={evt.evidence_image_url} alt='Evidence' className='w-16 h-11 object-cover rounded border border-slate-200 cursor-pointer hover:scale-105 transition-transform' onClick={() => setPreviewEvent(evt)} onError={e => { e.target.onerror=null; e.target.src='/sample_evidence/pothole.jpg'; }} /> : <div className='w-16 h-11 bg-slate-100 rounded border flex items-center justify-center'><Camera className='w-4 h-4 text-slate-400' /></div>}
                      </td>
                      <td className='px-4 py-3'><p className='font-bold text-slate-800'>{evt.event_type && evt.event_type.replace('_',' ')}</p><p className='text-slate-400 font-mono text-[10px]'>{evt.camera_id}</p></td>
                      <td className='px-4 py-3 font-mono font-bold'>{Math.round((evt.confidence||0)*100)}%</td>
                      <td className='px-4 py-3'><span className={'px-1.5 py-0.5 rounded border text-[10px] font-bold ' + (SEV_CLS[evt.severity] || SEV_CLS.MEDIUM)}>{evt.severity}</span></td>
                      <td className='px-4 py-3'><span className={'px-2 py-0.5 rounded text-[10px] font-bold ' + (evt.status==='PENDING_REVIEW' ? 'bg-amber-100 text-amber-800 border border-amber-300' : evt.status==='VERIFIED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : evt.status==='CONVERTED' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-100 text-slate-600 border border-slate-300')}>{evt.status==='PENDING_REVIEW' ? 'AI DETECTED' : evt.status}</span></td>
                      <td className='px-4 py-3 text-slate-500'><p className='truncate max-w-[110px]'>{evt.address || evt.camera_id}</p></td>
                      <td className='px-4 py-3'>
                        <div className='flex flex-col gap-1'>
                          {pending && <><button onClick={() => doReview(id,'VERIFIED')} disabled={busy} className='px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold disabled:opacity-50 transition'>Verify</button><button onClick={() => doReview(id,'DISMISSED')} disabled={busy} className='px-2 py-1 rounded bg-slate-400 hover:bg-slate-500 text-white text-[10px] font-bold disabled:opacity-50 transition'>Dismiss</button></>}
                          {(pending || verified) && <button onClick={() => doConvert(id)} disabled={busy} className='px-2 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white text-[10px] font-bold disabled:opacity-50 transition'>Work Order</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewEvent && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4' onClick={() => setPreviewEvent(null)}>
          <div className='bg-white rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl' onClick={e => e.stopPropagation()}>
            <div className='flex items-center justify-between px-5 py-3 border-b border-slate-200'>
              <h3 className='font-bold text-slate-900 text-sm'>Evidence Frame — {previewEvent.event_id}</h3>
              <button onClick={() => setPreviewEvent(null)} className='text-slate-400 hover:text-slate-700'><XCircle className='w-5 h-5' /></button>
            </div>
            {previewEvent.evidence_image_url ? <img src={previewEvent.evidence_image_url} alt='Evidence' className='w-full max-h-96 object-contain bg-black' onError={e => { e.target.onerror=null; e.target.src='/sample_evidence/pothole.jpg'; }} /> : <div className='p-8 text-center text-slate-400'>No evidence image available</div>}
            <div className='px-5 py-3 text-xs text-slate-500 grid grid-cols-2 gap-2 border-t border-slate-100'>
              <div><span className='font-semibold'>Camera:</span> {previewEvent.camera_id}</div>
              <div><span className='font-semibold'>Confidence:</span> {Math.round((previewEvent.confidence||0)*100)}%</div>
              <div><span className='font-semibold'>Severity:</span> {previewEvent.severity}</div>
              <div><span className='font-semibold'>Status:</span> {previewEvent.status}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CCTVVisionPage;
