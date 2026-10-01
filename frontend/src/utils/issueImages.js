const IMAGE_PATHS = {
  road_infrastructure: {
    before: '/image/pathole/before/0428f686-a431-4415-b4f9-9c4d888f2a92.jpg',
    after: '/image/pathole/after/2b14d65d-fb97-43e7-83af-8b9a6da66252.jpg'
  },
  waste_management: {
    before: '/image/garbage/before/89a88795-711e-4a10-8fb5-e8ec09e7423b.jpg',
    after: '/image/garbage/after/0151c5e2-0fae-42cb-846b-a28933d1d887.jpg'
  },
  electrical_street_lighting: {
    before: '/image/Strretlight/before/fe5b6322-3344-49b8-be14-9cc5de3f5169.jpg',
    after: '/image/Strretlight/after/447dba68-3a58-44d4-ba9c-e19d70001011.jpg'
  },
  water_supply: {
    before: '/image/water_leak/before/23c9fbe3-8d33-4dac-8e87-71b0504d787b.jpg',
    after: '/image/water_leak/after/09fbbc53-0904-4a0a-ba9a-c7d27ffd6c88.jpg'
  },
  drainage_sanitation: {
    before: '/image/Storm%20drainage/before/d954fcbc-4eb9-45cc-88f8-03f29ce3f589.jpg',
    after: '/image/Storm%20drainage/after/0cda410f-1d4b-4b5d-908d-c20e26df910b.jpg'
  }
};

export const issueImageFor = (category, stage = 'before') => {
  const key = String(category || '').toLowerCase();
  const normalized = key.includes('waste') || key.includes('garbage') || key.includes('sanitation')
    ? 'waste_management'
    : key.includes('water') || key.includes('leak') || key.includes('pipe')
      ? 'water_supply'
      : key.includes('drain') || key.includes('sewer') || key.includes('manhole')
        ? 'drainage_sanitation'
        : key.includes('light') || key.includes('electric') || key.includes('pole')
          ? 'electrical_street_lighting'
          : 'road_infrastructure';
  const path = IMAGE_PATHS[normalized][stage] || IMAGE_PATHS[normalized].before;
  const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
  return apiBase ? `${apiBase}${path}` : path;
};
