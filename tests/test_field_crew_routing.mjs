import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_ASSIGNMENT_LIMIT,
  getUnmappedStops,
  hasValidCoordinates,
  optimizeStops,
  selectNearbyReports
} from '../frontend/src/utils/fieldCrewRouting.js';

test('greedy route visits close stops before the distant stop', () => {
  const officer = { current_lat: 18.52, current_lon: 73.856 };
  const jobs = [
    { id: 'far', latitude: 18.60, longitude: 73.90 },
    { id: 'near-2', latitude: 18.522, longitude: 73.856 },
    { id: 'near-1', latitude: 18.521, longitude: 73.856 }
  ];
  assert.deepEqual(optimizeStops(jobs, officer).map((job) => job.id), ['near-1', 'near-2', 'far']);
});

test('missing coordinates are unmapped, while valid equator coordinates remain valid', () => {
  const jobs = [
    { id: 'missing-null', latitude: null, longitude: null },
    { id: 'missing-empty', latitude: '', longitude: '' },
    { id: 'valid-zero', latitude: 0, longitude: 0 },
    { id: 'invalid-range', latitude: 95, longitude: 10 }
  ];
  assert.deepEqual(optimizeStops(jobs, { current_lat: 18.52, current_lon: 73.85 }).map((job) => job.id), ['valid-zero']);
  assert.deepEqual(getUnmappedStops(jobs).map((job) => job.id), ['missing-null', 'missing-empty', 'invalid-range']);
  assert.equal(hasValidCoordinates({ latitude: 0, longitude: 0 }), true);
});

test('route computation is safe before a crew member has loaded', () => {
  assert.deepEqual(optimizeStops([], null), []);
});

test('nearby alert selection enforces radius, assignment ownership, and terminal status', () => {
  const origin = { latitude: 18.52, longitude: 73.8567 };
  const reports = [
    { id: 'critical-near', latitude: 18.5201, longitude: 73.8567, severity: 'CRITICAL', status: 'Submitted', department_id: 1 },
    { id: 'low-near', latitude: 18.5202, longitude: 73.8567, severity: 'LOW', status: 'Submitted', department_id: 1 },
    { id: 'same-crew', latitude: 18.5203, longitude: 73.8567, severity: 'HIGH', status: 'Assigned', assigned_officer_id: 4, department_id: 1 },
    { id: 'other-crew', latitude: 18.5203, longitude: 73.8567, severity: 'CRITICAL', status: 'Assigned', assigned_officer_id: 9, department_id: 1 },
    { id: 'wrong-department', latitude: 18.5201, longitude: 73.8567, severity: 'CRITICAL', status: 'Submitted', department_id: 2 },
    { id: 'resolved', latitude: 18.5203, longitude: 73.8567, severity: 'CRITICAL', status: 'Resolved', department_id: 1 },
    { id: 'far', latitude: 18.54, longitude: 73.8567, severity: 'CRITICAL', status: 'Submitted', department_id: 1 },
    { id: 'no-pin', latitude: null, longitude: null, severity: 'HIGH', status: 'Submitted', department_id: 1 }
  ];
  assert.deepEqual(selectNearbyReports(reports, origin, 4, 1, 1).map((report) => report.id), ['critical-near', 'same-crew', 'low-near']);
});

test('absolute daily assignment cap is twelve jobs', () => {
  assert.equal(DAILY_ASSIGNMENT_LIMIT, 12);
});
