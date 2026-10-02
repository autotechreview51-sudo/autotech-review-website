// Only classify details stated in a title or already curated in the publication.
export const cleanTitle = title => String(title).replace(/\s*#\S+/g, '').trim();
const brands = [
  ['Mercedes-Benz', /\bMercedes(?:-Benz)?\b|\bGLC\s*300\b/i],
  ['Toyota', /\bToyota\b|\bCamry\b|\bRAV4\b|\bCorolla\s+Cross\b/i],
  ...['Acura','Alfa Romeo','Aston Martin','Audi','Bentley','BMW','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ferrari','Fiat','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Jaguar','Jeep','Kia','Lamborghini','Land Rover','Lexus','Lincoln','Lucid','Mazda','MINI','Mitsubishi','Nissan','Polestar','Porsche','Ram','Rivian','Rolls-Royce','Subaru','Tesla','Volkswagen','Volvo'].map(make => [make, new RegExp('\\b' + make.replaceAll(' ', '\\s+') + '\\b', 'i')])
];
const unique = values => [...new Set(values)].sort();
export function matchingVehicles(title, vehicles) {
  const year = title.match(/\b20\d{2}\b/)?.[0];
  if (!year) return [];
  return vehicles.filter(vehicle => {
    if (String(vehicle.year) !== year) return false;
    const model = vehicle.model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll(' ', '\\s+');
    return new RegExp('\\b' + model + '\\b', 'i').test(title);
  });
}
export function videoMetadata(title, vehicles = []) {
  const makes = unique([...vehicles.map(v => v.make), ...brands.filter(([,pattern]) => pattern.test(title)).map(([make]) => make)]);
  // A title can compare model years; the first explicit year identifies its subject.
  const year = title.match(/\b20\d{2}\b/)?.[0];
  const types = unique([...vehicles.map(v => v.type), ...[['SUV', /\bSUVs?\b/i], ['Sedan', /\bsedans?\b/i], ['Truck', /\b(?:pickup|truck)s?\b/i], ['Hatchback', /\bhatchbacks?\b/i], ['Coupe', /\bcoup[eé]s?\b/i], ['Convertible', /\bconvertibles?\b/i], ['Minivan', /\bminivans?\b/i], ['Wagon', /\bwagons?\b/i]].filter(([,pattern]) => pattern.test(title)).map(([type]) => type)]);
  return { makes, years: unique([...vehicles.map(v => String(v.year)), ...(year ? [year] : [])]), types };
}
export const validVideo = video => /^[\w-]{11}$/.test(video?.id || '') && typeof video.title === 'string' && video.title.trim() && Number.isFinite(Date.parse(video.published));
export const feedVideos = feed => [...new Map([...(feed.archive || []), ...(feed.latestVideos || []), ...(feed.latestLongVideos || []), ...(feed.latestShorts || [])].filter(validVideo).map(v => [v.id, v])).values()];
