import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Activity, AlertTriangle, ArrowUpRight, Check, CheckCircle2, Clock3, ExternalLink, MapPin, Navigation, RefreshCw, ShieldCheck, Users, Wrench } from 'lucide-react';
import { officerApi } from '../api/officerApi';
import { complaintApi } from '../api/complaintApi';
import { ACTIVE_STATUSES, DAILY_ASSIGNMENT_LIMIT, MAP_CENTER, getUnmappedStops, hasValidCoordinates, optimizeStops, selectNearbyReports } from '../utils/fieldCrewRouting';
import { issueImageFor } from '../utils/issueImages';

const makeIcon = (color, label) => L.divIcon({
  className: 'crew-route-marker',
  html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid white;box-shadow:0 2px 7px #0f172a55;display:grid;place-items:center"><span style="transform:rotate(45deg);color:white;font:700 12px sans-serif">${label}</span></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28]
});

const FitRoute = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [28, 28], maxZoom: 14 });
    else if (points.length === 1) map.setView(points[0], 14);
  }, [map, points]);
  return null;
};

const workflowFor = (task) => {
  const subject = `${task?.category || ''} ${task?.issue_type || ''} ${task?.title || ''}`.toLowerCase();
  if (subject.includes('water') || subject.includes('leak') || subject.includes('pipe')) return ['Secure the area and check for traffic or electrical hazards', 'Shut off or isolate the affected water section', 'Repair the leak and restore the surface safely', 'Test for leaks, photograph the repair, and submit for review'];
  if (subject.includes('drain') || subject.includes('sewer') || subject.includes('manhole')) return ['Set barriers and use required protective equipment', 'Inspect the drain and clear the blockage safely', 'Check water flow and restore the cover or grate', 'Photograph the cleared site and submit for review'];
  if (subject.includes('light') || subject.includes('electric') || subject.includes('pole')) return ['Secure the work zone and arrange safe access equipment', 'Isolate the electrical supply before handling the fixture', 'Repair the fitting and verify the light is operating', 'Photograph the repair and submit for review'];
  if (subject.includes('garbage') || subject.includes('waste') || subject.includes('sanit')) return ['Mark the collection area and check for hazardous waste', 'Collect and remove waste using the assigned vehicle', 'Clean and sanitize the affected public area', 'Photograph the cleared area and submit for review'];
  return ['Set traffic barriers and inspect the defect and surrounding surface', 'Prepare the damaged area and remove loose material', 'Apply and compact the road repair material', 'Check the surface, photograph the repair, and submit for review'];
};

const normalizeStatus = (status) => String(status || '').trim().toUpperCase();

const getReportImage = (task) => {
  const evidencePhoto = task?.evidence?.find((item) => (item.type || 'image').toLowerCase() === 'image')?.file_url;
  const url = task?.image_url || evidencePhoto;
  if (url) {
    if (/^https?:\/\//i.test(url)) return url;
    const backendUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
    return backendUrl ? `${backendUrl}${url.startsWith('/') ? url : `/${url}`}` : url;
  }
  const subject = `${task?.category || ''} ${task?.issue_type || ''} ${task?.title || ''}`.toLowerCase();
  return issueImageFor(subject, 'before');
};

const getCompletionPhoto = (task) => {
  const url = task?.completion_photo_url;
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const backendUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
  return backendUrl ? `${backendUrl}${url.startsWith('/') ? url : `/${url}`}` : url;
};

export const FieldCrewPage = () => {
  const [officers, setOfficers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [officer, setOfficer] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [nearbyAlert, setNearbyAlert] = useState(null);
  const [checkedSteps, setCheckedSteps] = useState({});
  const [completionPhotos, setCompletionPhotos] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const firstPoll = useRef(true);
  const seenReports = useRef(new Set());

  const loadFleet = useCallback(async (preferredId) => {
    try {
      const crew = await officerApi.getOfficers();
      setOfficers(crew);
      const nextId = preferredId || selectedId || String(crew[0]?.id || '');
      if (!nextId) {
        setOfficer(null);
        setTasks([]);
        setLoading(false);
        return;
      }
      setSelectedId(String(nextId));
      const workday = await officerApi.getOfficerTasks(nextId);
      setOfficer(workday.officer);
      const assigned = (workday.tasks || []).filter((task) => ACTIVE_STATUSES.has(normalizeStatus(task.status)));
      setTasks(assigned.slice(0, DAILY_ASSIGNMENT_LIMIT));
      setError('');
    } catch (err) {
      setError(err?.message || 'Could not load the live crew board. Check that the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { loadFleet(); }, []); // load the selected crew once on entry

  useEffect(() => {
    if (!officer?.id) return undefined;
    const timer = window.setInterval(() => loadFleet(officer.id), 20000);
    return () => window.clearInterval(timer);
  }, [officer?.id, loadFleet]);

  const routeTasks = useMemo(() => optimizeStops(tasks, officer), [tasks, officer]);
  const mapPoints = useMemo(() => {
    const points = [];
    if (hasValidCoordinates({ latitude: officer?.current_lat, longitude: officer?.current_lon })) {
      points.push([Number(officer.current_lat), Number(officer.current_lon)]);
    }
    routeTasks.forEach((task) => points.push([Number(task.latitude), Number(task.longitude)]));
    return points;
  }, [officer, routeTasks]);
  const unmappedTasks = useMemo(() => getUnmappedStops(tasks), [tasks]);

  const dailyCount = officer?.daily_assignment_date === new Date().toISOString().slice(0, 10)
    ? Number(officer.daily_assignment_count || 0)
    : 0;
  const dailyLimit = Math.min(DAILY_ASSIGNMENT_LIMIT, Number(officer?.daily_assignment_limit || DAILY_ASSIGNMENT_LIMIT));
  const isOnShift = Boolean(officer && officer.status !== 'OFFLINE');

  const pollNearbyReports = useCallback(async () => {
    if (!officer?.id || !isOnShift) return;
    try {
      const reports = await complaintApi.getComplaints();
      if (firstPoll.current) {
        (reports || []).forEach((report) => seenReports.current.add(report.id));
        firstPoll.current = false;
        return;
      }
      const origin = { latitude: Number(officer.current_lat), longitude: Number(officer.current_lon) };
      const fresh = (reports || []).filter((report) => {
        if (seenReports.current.has(report.id)) return false;
        seenReports.current.add(report.id);
      });
      const nearby = selectNearbyReports(fresh, origin, officer.id, 1, officer.department_id);
      if (nearby.length && !nearbyAlert) setNearbyAlert(nearby[0]);
    } catch { /* the crew board stays usable during a short network interruption */ }
  }, [officer, isOnShift, nearbyAlert]);

  useEffect(() => {
    if (!isOnShift) return undefined;
    pollNearbyReports();
    const timer = window.setInterval(pollNearbyReports, 20000);
    return () => window.clearInterval(timer);
  }, [pollNearbyReports, isOnShift]);

  const setDutyStatus = async (status) => {
    if (!officer) return;
    setBusy(true);
    try {
      await officerApi.updateOfficerStatus(officer.id, status);
      await loadFleet(officer.id);
      setNotice(status === 'OFFLINE' ? 'You are off shift. AI dispatch will route incoming reports to crews with available capacity.' : 'Shift started. Nearby unassigned reports will appear here.');
    } catch (err) {
      setError(err?.message || 'Could not update shift status.');
    } finally { setBusy(false); }
  };

  const updateTask = async (task, status, remarks) => {
    setBusy(true);
    try {
      await complaintApi.updateStatus(task.id, status, remarks);
      await loadFleet(officer.id);
      setNotice(`#${task.id} moved to ${status}.`);
    } catch (err) {
      setError(err?.message || 'Could not update this work order.');
    } finally { setBusy(false); }
  };

  const addNearbyReport = async () => {
    if (!nearbyAlert || !officer) return;
    setBusy(true);
    try {
      await officerApi.assignOfficer(nearbyAlert.id, officer.id, 'Nearby in-shift crew accepted a new report into the optimized route.');
      setNotice(`Nearby report #${nearbyAlert.id} added to your route.`);
      setNearbyAlert(null);
      await loadFleet(officer.id);
    } catch (err) {
      setError(err?.message || 'Could not add the nearby report. It remains in the municipal queue.');
      setNearbyAlert(null);
    } finally { setBusy(false); }
  };

  const toggleStep = (taskId, index) => setCheckedSteps((prev) => ({
    ...prev,
    [taskId]: { ...(prev[taskId] || {}), [index]: !prev[taskId]?.[index] }
  }));

  const handleCompletionPhoto = (taskId, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setCompletionPhotos((prev) => {
      if (prev[taskId]?.previewUrl) URL.revokeObjectURL(prev[taskId].previewUrl);
      return { ...prev, [taskId]: { file, previewUrl } };
    });
  };

  const submitCompletionPhoto = async (task) => {
    const selectedPhoto = completionPhotos[task.id];
    if (!selectedPhoto?.file) {
      setError('Choose a completion photo before submitting this work order.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await complaintApi.submitResolutionEvidence(
        task.id,
        selectedPhoto.file,
        `Field crew completed the on-site workflow at ${task.landmark || task.address || 'the reported landmark'}.`,
        officer?.id
      );
      setCompletionPhotos((prev) => {
        if (prev[task.id]?.previewUrl) URL.revokeObjectURL(prev[task.id].previewUrl);
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
      setNotice(`#${task.id} photo submitted. AI verdict: ${result.status || 'received'}; municipal review is next.`);
      await loadFleet(officer?.id);
    } catch (err) {
      setError(err?.message || 'Could not upload the completion photo.');
    } finally {
      setBusy(false);
    }
  };

  const shiftMapCenter = mapPoints.length ? mapPoints[0] : MAP_CENTER;
  const directionsUrl = routeTasks.length
    ? `https://www.google.com/maps/dir/${mapPoints.map((point) => `${point[0]},${point[1]}`).join('/')}`
    : '';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-700"><Wrench size={14} /> Field Crew Workspace</div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Today’s work, in the right order</h1>
            <p className="mt-1 text-sm text-slate-500">A nearby-first route, clear on-site steps, and a safe daily workload limit.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={selectedId} onChange={(event) => loadFleet(event.target.value)} className="max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium" aria-label="Select field crew member">
              {officers.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.department_name || member.role}</option>)}
            </select>
            {isOnShift ? <button disabled={busy} onClick={() => setDutyStatus('OFFLINE')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">End shift</button> : <button disabled={busy || !officer} onClick={() => setDutyStatus('ON_DUTY')} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">Start shift</button>}
          </div>
        </div>

        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle size={18} className="mt-0.5 shrink-0" />{error}</div>}
        {notice && <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><span className="flex items-center gap-2"><CheckCircle2 size={17} />{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between text-sm text-slate-500"><span>Today’s assignments</span><Wrench size={17} /></div><div className="mt-2 flex items-baseline gap-2"><strong className="text-3xl">{Math.min(dailyCount, dailyLimit)}</strong><span className="text-sm text-slate-400">/ {dailyLimit} work orders</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700" style={{ width: `${Math.min(100, (dailyCount / dailyLimit) * 100)}%` }} /></div><p className="mt-2 text-xs text-slate-500">Nearby routes allow more stops; longer routes reduce the daily limit. Maximum 12.</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between text-sm text-slate-500"><span>Open work orders</span><ClipboardCount /></div><div className="mt-2 text-3xl font-bold">{tasks.length}</div><p className="mt-1 text-xs text-slate-500">Sorted to keep nearby stops together.</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between text-sm text-slate-500"><span>Shift status</span><Activity size={17} /></div><div className="mt-2 flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${isOnShift ? 'bg-emerald-500' : 'bg-slate-400'}`} /><strong className="text-lg">{officer?.status?.replace('_', ' ') || (loading ? 'Loading…' : 'No crew selected')}</strong></div><p className="mt-1 text-xs text-slate-500">{isOnShift ? 'Nearby reports can alert you during this shift.' : 'AI dispatch looks for an available on-shift crew.'}</p></div>
        </section>

        {nearbyAlert && isOnShift && <section role="alertdialog" aria-label="Nearby report" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4"><div className="flex gap-3"><img src={getReportImage(nearbyAlert)} alt={`Reported issue ${nearbyAlert.id}`} className="h-16 w-20 shrink-0 rounded-lg object-cover" /><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-800"><MapPin size={19} /></span><div><div className="flex items-center gap-2"><strong className="text-sm text-amber-950">New report near your route</strong><span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">Within 1 km</span></div><p className="mt-1 text-sm text-amber-900">#{nearbyAlert.id} · {nearbyAlert.issue_type || nearbyAlert.category} · {nearbyAlert.address || 'Location pinned'}</p><p className="mt-1 text-xs text-amber-800">Landmark: {nearbyAlert.landmark || 'Not provided'} · Add the stop while you are nearby; your daily cap still applies.</p></div></div><div className="mt-3 flex shrink-0 gap-2 sm:mt-0"><button disabled={busy || dailyCount >= dailyLimit} onClick={addNearbyReport} className="rounded-lg bg-amber-800 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{dailyCount >= dailyLimit ? 'Daily limit reached' : 'Add to my route'}</button><button onClick={() => setNearbyAlert(null)} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900">Dismiss</button></div></section>}

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><div><h2 className="font-semibold">Optimized route</h2><p className="text-xs text-slate-500">Nearest-stop order from your last reported crew location.</p></div>{directionsUrl && <a href={directionsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Open directions <ExternalLink size={13} /></a>}</div>
            <div className="relative h-[360px] sm:h-[470px]">
              <MapContainer center={shiftMapCenter} zoom={12} scrollWheelZoom className="h-full w-full">
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {mapPoints.length > 1 && <Polyline positions={mapPoints} pathOptions={{ color: '#1d4ed8', weight: 4, opacity: 0.78, dashArray: '8 8' }} />}
                {officer && hasValidCoordinates({ latitude: officer.current_lat, longitude: officer.current_lon }) && <><Circle center={[Number(officer.current_lat), Number(officer.current_lon)]} radius={100} pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.25 }} /><Marker position={[Number(officer.current_lat), Number(officer.current_lon)]} icon={makeIcon('#0f766e', 'Y')}><Popup>Your crew’s last reported position</Popup></Marker></>}
                {routeTasks.map((task, index) => <Marker key={task.id} position={[Number(task.latitude), Number(task.longitude)]} icon={makeIcon(index === 0 ? '#dc2626' : '#1d4ed8', String(index + 1))}><Popup><strong>Stop {index + 1} · #{task.id}</strong><br />{task.issue_type || task.category}<br />{task.address || 'Location pin'}<br />Landmark: {task.landmark || task.area || 'Not provided'}</Popup></Marker>)}
                <FitRoute points={mapPoints} />
              </MapContainer>
            </div>
            <div className="flex items-start gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500"><Navigation size={14} className="mt-0.5 shrink-0 text-blue-700" /> Stops are ordered by straight-line distance to reduce backtracking. Use Open directions for road navigation and traffic.</div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between"><div><h2 className="font-semibold">Work orders</h2><p className="text-xs text-slate-500">Follow the numbered route order.</p></div><button onClick={() => loadFleet(officer?.id)} disabled={loading || busy} aria-label="Refresh work orders" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button></div>
            {loading ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading today’s work…</div> : routeTasks.length === 0 && unmappedTasks.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-7 text-center"><CheckCircle2 size={25} className="mx-auto text-emerald-600" /><h3 className="mt-2 text-sm font-semibold">No open stops assigned</h3><p className="mt-1 text-xs text-slate-500">New assignments will appear here. When you are on shift, nearby reports can be added to your route.</p></div> : routeTasks.map((task, index) => {
              const steps = workflowFor(task);
              const done = checkedSteps[task.id] || {};
              const allDone = steps.every((_, stepIndex) => done[stepIndex]);
              const inProgress = normalizeStatus(task.status) === 'IN PROGRESS';
              const awaitingReview = normalizeStatus(task.status) === 'AWAITING VERIFICATION';
              const beforePhoto = getReportImage(task);
              const afterPhoto = getCompletionPhoto(task);
              const selectedPhoto = completionPhotos[task.id];
              return <article key={task.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${index === 0 ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-800'}`}>{index + 1}</span><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold">{task.issue_type || task.title || task.category}</h3><span className="font-mono text-[10px] text-slate-400">#{task.id}</span></div><span className={`mt-1 inline-flex rounded-md px-2 py-1 text-[10px] font-bold ${normalizeStatus(task.severity) === 'CRITICAL' || normalizeStatus(task.severity) === 'HIGH' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{task.severity || 'MEDIUM'} priority</span></div></div>
                  <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-800">Stop {index + 1}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a href={beforePhoto} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"><img src={beforePhoto} alt={`Reported condition for ${task.id}`} loading="lazy" className="h-28 w-full object-cover" /><span className="block px-2 py-1.5 text-[10px] font-semibold text-slate-600">Report photo</span></a>
                  {selectedPhoto || afterPhoto ? <div className="overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50"><img src={selectedPhoto?.previewUrl || afterPhoto} alt={`Completed work for ${task.id}`} className="h-28 w-full object-cover" /><span className="block px-2 py-1.5 text-[10px] font-semibold text-emerald-800">{selectedPhoto ? 'Ready to upload' : 'Submitted completion photo'}</span></div> : <div className="flex h-[7rem] items-center justify-center rounded-lg border border-dashed border-slate-200 text-center text-[10px] text-slate-400">After photo<br />not submitted</div>}
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex items-start gap-1.5"><MapPin size={14} className="mt-0.5 shrink-0 text-blue-700" /><span>{task.address || 'Address needs confirmation'}{hasValidCoordinates(task) && task.routeDistanceKm !== undefined && <span className="ml-1 whitespace-nowrap text-slate-400">· {task.routeDistanceKm.toFixed(1)} km from previous stop</span>}</span></div>
                  <div className="flex items-start gap-1.5"><Navigation size={14} className="mt-0.5 shrink-0 text-amber-600" /><span><strong className="text-slate-700">Landmark:</strong> {task.landmark || task.area || 'No landmark on report'}</span></div>
                  {(task.ward || task.area) && <p className="pl-5 text-[10px] text-slate-400">{[task.area, task.ward].filter(Boolean).join(' · ')}</p>}
                </div>
                <div className={`mt-3 space-y-1.5 ${awaitingReview ? 'opacity-60' : ''}`}>
                  {steps.map((step, stepIndex) => <button key={step} disabled={!inProgress || awaitingReview} onClick={() => toggleStep(task.id, stepIndex)} className="flex w-full items-start gap-2 rounded-md py-1 text-left text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-default"><span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${done[stepIndex] ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>{done[stepIndex] && <Check size={11} />}</span><span className={done[stepIndex] ? 'text-slate-400 line-through' : ''}>{step}</span></button>)}
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div className="mb-2 flex items-center justify-between text-[10px] text-slate-400"><span className="flex items-center gap-1"><Clock3 size={12} />{task.eta_minutes ? `Dispatch ETA ${task.eta_minutes} min` : task.status}</span>{task.severity_reason && <span title={task.severity_reason} className="max-w-[55%] truncate">Risk note: {task.severity_reason}</span>}</div>
                  {awaitingReview ? <span className="inline-flex rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Awaiting municipal review</span> : inProgress ? <div className="flex flex-wrap items-center justify-between gap-2"><label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{selectedPhoto ? 'Choose another photo' : 'Add completion photo'}<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => handleCompletionPhoto(task.id, event.target.files?.[0])} /></label><button disabled={!allDone || !selectedPhoto || busy} onClick={() => submitCompletionPhoto(task)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Upload &amp; submit</button><p className="w-full text-[10px] text-slate-400">Complete every checklist step and attach an after photo to submit for AI and municipal review.</p></div> : <button disabled={busy} onClick={() => updateTask(task, 'In Progress', 'Field crew arrived on site and started the work order checklist.')} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50">Start work <ArrowUpRight size={13} className="ml-1 inline" /></button>}
                </div>
              </article>;
            })}
            {unmappedTasks.length > 0 && <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="flex items-start gap-2"><AlertTriangle size={16} className="mt-0.5 text-amber-700" /><div><h3 className="text-sm font-semibold text-amber-950">{unmappedTasks.length} stop{unmappedTasks.length === 1 ? '' : 's'} need a location pin</h3><p className="text-xs text-amber-900">These work orders stay visible, but are left out of route optimization until coordinates are verified.</p></div></div>{unmappedTasks.map((task) => <div key={task.id} className="flex items-center gap-3 rounded-lg border border-amber-100 bg-white p-2"><img src={getReportImage(task)} alt={`Reported condition for ${task.id}`} loading="lazy" className="h-14 w-16 rounded object-cover" /><div className="min-w-0"><strong className="block truncate text-xs">#{task.id} · {task.issue_type || task.category}</strong><span className="block truncate text-[10px] text-slate-500">{task.address || 'No address provided'} · Landmark: {task.landmark || 'Not provided'}</span></div></div>)}</section>}
          </div>
        </section>

        {!isOnShift && officer && <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-blue-700" /><p><strong className="text-slate-800">AI dispatch coverage is on.</strong> Since this crew is off shift, new reports are matched to another active crew with distance-adjusted daily capacity. Reports wait in the municipal queue when crews reach their limit of up to 12 work orders.</p></div>}
      </main>
    </div>
  );
};

const ClipboardCount = () => <Users size={17} />;

export default FieldCrewPage;
