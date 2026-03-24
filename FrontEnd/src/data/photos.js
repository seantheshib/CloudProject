const locations = [
  { id: 'tokyo', name: 'Tokyo, Japan', color: '#ED93B1' },
  { id: 'paris', name: 'Paris, France', color: '#85B7EB' },
  { id: 'nyc', name: 'New York, USA', color: '#F0997B' },
  { id: 'singapore', name: 'Singapore', color: '#5DCAA5' },
  { id: 'london', name: 'London, UK', color: '#AFA9EC' },
];

const timePeriods = [
  { id: 'q1_25', name: 'Jan – Mar 2025', color: '#85B7EB' },
  { id: 'q2_25', name: 'Apr – Jun 2025', color: '#5DCAA5' },
  { id: 'q3_25', name: 'Jul – Sep 2025', color: '#F0997B' },
  { id: 'q4_25', name: 'Oct – Dec 2025', color: '#FAC775' },
  { id: 'q1_26', name: 'Jan – Mar 2026', color: '#ED93B1' },
];

const people = [
  { id: 'family', name: 'Family', color: '#F0997B' },
  { id: 'friends', name: 'Friends', color: '#85B7EB' },
  { id: 'solo', name: 'Solo', color: '#AFA9EC' },
  { id: 'colleagues', name: 'Colleagues', color: '#5DCAA5' },
  { id: 'partner', name: 'Partner', color: '#ED93B1' },
];

const photoNames = [
  'Sunset at Shibuya', 'Eiffel at dusk', 'Central Park snow', 'Marina Bay night',
  'Big Ben fog', 'Cherry blossoms', 'Louvre visit', 'Brooklyn Bridge', 'Sentosa beach',
  'Thames walk', 'Ramen dinner', 'Croissant cafe', 'NYC pizza', 'Hawker stall',
  'Fish & chips', 'Shinjuku neon', 'Montmartre stairs', 'Times Square', 'Gardens by Bay',
  'Camden Market', 'Team selfie', 'Family dinner', 'Beach day', 'Office party',
  'Date night', 'Hiking trail', 'Concert', 'Cooking class', 'Museum tour',
  'Rooftop bar', 'Street art', 'Train ride', 'Market visit', 'Temple visit',
  'River cruise', 'Skyline view', 'Night walk', 'Food tour', 'Park jog',
  'Birthday party', 'Graduation', 'Wedding', 'Playground', 'Cafe work',
  'Library visit', 'Yoga class', 'Bike ride', 'Picnic', 'Airport lounge',
  'Hotel pool', 'Bookstore', 'Gallery opening', 'Sunrise run', 'Flower market',
  'Old town', 'Castle visit', 'Wine tasting', 'Pottery class', 'Board games',
  'Karaoke night', 'Arcade', 'Pet cafe', 'Aquarium', 'Ferris wheel',
  'Mountain view', 'Lake day', 'Snow day', 'Autumn leaves', 'Spring garden',
  'Summer festival', 'Winter lights', 'Rainy day', 'Foggy morning', 'Golden hour',
  'Blue hour', 'Stargazing', 'Moonrise', 'Cloud watching', 'Rainbow sighting',
  'Beach sunset', 'City lights', 'Countryside', 'Harbor walk', 'Bridge crossing',
  'Tunnel of lights', 'Night market', 'Dawn patrol', 'Dusk stroll', 'Quiet moment',
  'Group photo', 'Solo hike', 'Couple shot', 'Family portrait', 'Team outing',
  'Old friends', 'New friends', 'Mentor chat', 'Study group', 'Lab session',
  'Project demo', 'Hackathon', 'Road trip', 'Flight view', 'Train window',
];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generatePhotos(count = 120) {
  const rand = seededRandom(42);
  const photos = [];

  for (let i = 0; i < count; i++) {
    const locIdx = Math.floor(rand() * locations.length);
    const timeIdx = Math.floor(rand() * timePeriods.length);
    const peopleIdx = Math.floor(rand() * people.length);
    const r = 3 + rand() * 7;

    photos.push({
      id: `photo_${i}`,
      label: photoNames[i % photoNames.length],
      radius: r,
      location: locIdx,
      time: timeIdx,
      people: peopleIdx,
      locationName: locations[locIdx].name,
      timeName: timePeriods[timeIdx].name,
      peopleName: people[peopleIdx].name,
    });
  }

  return photos;
}

export function generateEdges(photos) {
  const rand = seededRandom(123);
  const edges = [];

  for (let i = 0; i < photos.length; i++) {
    for (let j = i + 1; j < photos.length; j++) {
      let shared = 0;
      if (photos[i].location === photos[j].location) shared++;
      if (photos[i].time === photos[j].time) shared++;
      if (photos[i].people === photos[j].people) shared++;

      if (shared >= 2 && rand() < 0.35) {
        edges.push({ source: i, target: j, strength: shared });
      } else if (shared >= 1 && rand() < 0.06) {
        edges.push({ source: i, target: j, strength: shared });
      }
    }
  }

  return edges;
}

export const clusterConfigs = {
  location: {
    label: 'Location',
    clusters: locations.map((l, i) => ({ ...l, index: i })),
  },
  time: {
    label: 'Time period',
    clusters: timePeriods.map((t, i) => ({ ...t, index: i })),
  },
  people: {
    label: 'People',
    clusters: people.map((p, i) => ({ ...p, index: i })),
  },
};

export function getNodeColor(photo, filter) {
  if (filter === 'all') return null;
  const config = clusterConfigs[filter];
  return config.clusters[photo[filter]].color;
}

export function getDefaultColor(rand) {
  const mix = rand();
  if (mix < 0.35) return '#ffffff';
  if (mix < 0.48) return '#aaaaaa';
  if (mix < 0.56) return '#85B7EB';
  if (mix < 0.64) return '#5DCAA5';
  if (mix < 0.72) return '#F0997B';
  if (mix < 0.80) return '#AFA9EC';
  if (mix < 0.88) return '#ED93B1';
  return '#FAC775';
}
