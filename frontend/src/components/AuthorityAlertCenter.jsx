import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, LoaderCircle, CheckCircle2, Clock3 } from 'lucide-react';
import { complaintApi } from '../api/complaintApi';
import { useLanguage } from '../context/LanguageContext';

const getDeadlineState = (event, now) => {
  const reason = event.reason || '';
  const createdAt = Date.parse(event.created_at || '');
  const elapsedSinceAlertHours = Number.isFinite(createdAt)
    ? Math.max(0, (now - createdAt) / 3600000)
    : 0;

  if (/\(BREACHED\)|exceeded by/i.test(reason)) {
    const match = reason.match(/exceeded by\s+([\d.]+)h/i);
    return { overdueHours: (Number(match?.[1]) || 0) + elapsedSinceAlertHours };
  }

  const match = reason.match(/SLA deadline approaching:\s*([\d.]+)h remain/i);
  if (!match) return null;

  const remainingHours = Number(match[1]) - elapsedSinceAlertHours;
  return remainingHours <= 0
    ? { overdueHours: Math.abs(remainingHours) }
    : { remainingHours };
};

const formatHours = (hours) => {
  const rounded = Math.max(1, Math.ceil(hours));
  return `${rounded} ${rounded === 1 ? 'hour' : 'hours'}`;
};

export const AuthorityAlertCenter = ({ issues = [], onOpenIssue }) => {
  const { t } = useLanguage();
  const [events, setEvents] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acknowledging, setAcknowledging] = useState(() => new Set());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let current = true;
    let firstLoad = true;
    const load = async () => {
      if (firstLoad && current) setLoading(true);
      try {
        await complaintApi.runWatchdogSweep();
        const latest = await complaintApi.getAllWatchdogEvents(100);
        if (!current) return;
        setEvents(Array.isArray(latest) ? latest : []);
        setError('');
      } catch (loadError) {
        if (current) setError(loadError.message || 'Could not load municipal alerts.');
      } finally {
        if (current) setLoading(false);
        firstLoad = false;
      }
    };

    load();
    const interval = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      current = false;
      window.clearInterval(interval);
    };
  }, []);

  const issueById = useMemo(() => new Map(issues.map((issue) => [String(issue.id || '').replace('#', ''), issue])), [issues]);
  const activeAlerts = useMemo(() => {
    const seen = new Set();
    return events
      .filter((event) => !event.action_taken)
      .map((event) => {
        const issue = issueById.get(String(event.complaint_id || '').replace('#', ''));
        return { event, issue, deadline: getDeadlineState(event, now) };
      })
      .filter(({ issue, deadline }) => {
        if (!deadline) return false;
        if (issue && ['Resolved', 'Rejected', 'Dismissed'].includes(issue.status)) return false;
        return deadline.overdueHours !== undefined || deadline.remainingHours <= 12;
      })
      .sort((a, b) => {
        const aOverdue = a.deadline.overdueHours !== undefined;
        const bOverdue = b.deadline.overdueHours !== undefined;
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        return aOverdue
          ? b.deadline.overdueHours - a.deadline.overdueHours
          : a.deadline.remainingHours - b.deadline.remainingHours;
      })
      .filter(({ event, issue }) => {
        const masterId = issue?.masterGrievanceId || event.complaint_id;
        if (seen.has(masterId)) return false;
        seen.add(masterId);
        return true;
      });
  }, [events, issueById, now]);

  const hasOverdueAlerts = activeAlerts.some(({ deadline }) => deadline.overdueHours !== undefined);
  const alertHeaderTone = hasOverdueAlerts
    ? 'border-red-200 bg-red-50'
    : activeAlerts.length > 0
      ? 'border-orange-200 bg-orange-50'
      : 'border-slate-200 bg-slate-50';
  const alertIconTone = hasOverdueAlerts
    ? 'text-red-700'
    : activeAlerts.length > 0
      ? 'text-orange-700'
      : 'text-slate-500';
  const alertCountTone = hasOverdueAlerts
    ? 'bg-red-700 text-white'
    : activeAlerts.length > 0
      ? 'bg-orange-700 text-white'
      : 'bg-slate-200 text-slate-700';

  const handleAcknowledge = async (event) => {
    const issue = issueById.get(String(event.complaint_id || '').replace('#', ''));
    const masterId = issue?.masterGrievanceId || event.complaint_id;
    const matchingEvents = events.filter((candidate) => {
      if (candidate.action_taken || candidate.event !== event.event) return false;
      const candidateIssue = issueById.get(String(candidate.complaint_id || '').replace('#', ''));
      return (candidateIssue?.masterGrievanceId || candidate.complaint_id) === masterId;
    });
    setAcknowledging((previous) => new Set([...previous, ...matchingEvents.map((item) => item.id)]));
    try {
      await Promise.all(matchingEvents.map((item) => complaintApi.markWatchdogAction(item.id, 'Municipal official reviewed alert')));
      setEvents((previous) => previous.map((item) => item.id === event.id
        || matchingEvents.some((matched) => matched.id === item.id)
        ? { ...item, action_taken: true, action_notes: 'Municipal official reviewed alert' }
        : item));
    } catch (ackError) {
      setError(ackError.message || 'Could not acknowledge this alert.');
    } finally {
      setAcknowledging((previous) => {
        const next = new Set(previous);
        matchingEvents.forEach((item) => next.delete(item.id));
        return next;
      });
    }
  };

  return (
    <section className="border border-slate-200 bg-white" aria-label={t('Alerts')}>
      <header className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${alertHeaderTone}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <AlertTriangle className={`h-5 w-5 shrink-0 ${alertIconTone}`} aria-hidden="true" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className={`text-sm font-bold ${hasOverdueAlerts ? 'text-red-950' : activeAlerts.length > 0 ? 'text-orange-950' : 'text-slate-900'}`}>{t('Alerts')}</h2>
              <span className={`min-w-6 rounded px-1.5 py-0.5 text-center text-xs font-bold ${alertCountTone}`}>{activeAlerts.length}</span>
            </div>
            <p className={`text-[11px] ${hasOverdueAlerts ? 'text-red-800' : activeAlerts.length > 0 ? 'text-orange-800' : 'text-slate-600'}`}>{t('Reports overdue or due within 12 hours')}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label={expanded ? t('Collapse alerts') : t('Expand alerts')}
          onClick={() => setExpanded((value) => !value)}
          className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </header>

      {expanded && (
        <div className="max-h-[55vh] space-y-2 overflow-y-auto p-3 sm:p-4">
          {loading && (
            <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <LoaderCircle className="h-4 w-4 animate-spin" /> {t('Checking report deadlines…')}
            </div>
          )}
          {!loading && activeAlerts.length === 0 && (
            <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              {t('No reports are overdue or due within 12 hours.')}
            </div>
          )}
          {activeAlerts.map(({ event, issue, deadline }) => {
            const overdue = deadline.overdueHours !== undefined;
            const alertTone = overdue
              ? 'border-red-200 bg-[#fff0ee] text-red-800'
              : 'border-orange-200 bg-[#fff3e3] text-orange-900';
            return (
              <article key={event.id} role={overdue ? 'alert' : 'status'} className={`flex items-start gap-3 border p-3 sm:p-4 ${alertTone}`}>
                <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${overdue ? 'text-red-700' : 'text-orange-700'}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <h3 className={`text-sm font-semibold ${overdue ? 'text-red-900' : 'text-orange-950'}`}>
                      {overdue ? t('SLA deadline exhausted') : t('SLA deadline within 12 hours')}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {overdue
                        ? `${t('Overdue by')} ${formatHours(deadline.overdueHours)}`
                        : `${formatHours(deadline.remainingHours)} ${t('left')}`}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    {onOpenIssue ? (
                      <button type="button" onClick={() => onOpenIssue(event.complaint_id)} className="font-semibold underline underline-offset-2">
                        #{event.complaint_id} · {issue?.title || t('Open report')}
                      </button>
                    ) : <span className="font-semibold">#{event.complaint_id} · {issue?.title || t('Civic report')}</span>}
                    {issue?.location && <span className="text-slate-700">· {issue.location}</span>}
                  </div>
                  <button
                    type="button"
                    disabled={acknowledging.has(event.id)}
                    onClick={() => handleAcknowledge(event)}
                    className="mt-2 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-800 underline underline-offset-2 hover:bg-white/60 disabled:cursor-wait disabled:opacity-60"
                  >
                    {acknowledging.has(event.id) ? t('Saving…') : t('Mark reviewed')}
                  </button>
                </div>
              </article>
            );
          })}
          {error && <p role="alert" className="text-[11px] text-rose-700">{error}</p>}
        </div>
      )}
    </section>
  );
};

export default AuthorityAlertCenter;
