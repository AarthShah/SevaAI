export const DAILY_ASSIGNMENT_LIMIT = 12;
export const MAP_CENTER = [18.5204, 73.8567];
export const TERMINAL_STATUSES = new Set(['RESOLVED', 'REJECTED', 'DISMISSED']);
export const ACTIVE_STATUSES = new Set(['ASSIGNED', 'IN PROGRESS', 'AWAITING VERIFICATION', 'ESCALATED']);

export const hasValidCoordinates = (task) => {
  if (task?.latitude === null || task?.latitude === undefined || task?.latitude === '' ||
      task?.longitude === null || task?.longitude === undefined || task?.longitude === '') return false;
  const latitude = Number(task.latitude);
  const longitude = Number(task.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
};

export const distanceKm = (a, b) => {
  const rad = (value) => (value * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const pointFor = (task) => ({ latitude: Number(task.latitude), longitude: Number(task.longitude) });

export const optimizeStops = (tasks = [], officer = {}) => {
  const remaining = tasks.filter(hasValidCoordinates).map((task) => ({ ...task }));
  const ordered = [];
  const origin = hasValidCoordinates({ latitude: officer?.current_lat, longitude: officer?.current_lon })
    ? pointFor({ latitude: officer.current_lat, longitude: officer.current_lon })
    : { latitude: MAP_CENTER[0], longitude: MAP_CENTER[1] };
  let cursor = origin;

  while (remaining.length) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    remaining.forEach((task, index) => {
      const distance = distanceKm(cursor, pointFor(task));
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    const [next] = remaining.splice(nearestIndex, 1);
    ordered.push({ ...next, routeDistanceKm: nearestDistance });
    cursor = pointFor(next);
  }
  return ordered;
};

export const getUnmappedStops = (tasks = []) => tasks.filter((task) => !hasValidCoordinates(task));

export const selectNearbyReports = (reports = [], origin, officerId, radiusKm = 1, departmentId = null) => reports
  .filter((report) => {
    const assignedToCrew = Number(report.assigned_officer_id) === Number(officerId) && report.assigned_officer_id !== null;
    return (!report.assigned_officer_id || assignedToCrew) &&
      (!departmentId || Number(report.department_id) === Number(departmentId)) &&
      !TERMINAL_STATUSES.has(String(report.status || '').trim().toUpperCase()) &&
      hasValidCoordinates(report) &&
      distanceKm(origin, pointFor(report)) <= radiusKm;
  })
  .sort((a, b) => {
    const rank = (severity) => ({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[String(severity || '').toUpperCase()] || 0);
    return rank(b.severity) - rank(a.severity) || distanceKm(origin, pointFor(a)) - distanceKm(origin, pointFor(b));
  });
