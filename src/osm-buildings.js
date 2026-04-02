import {
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Path,
  ExtrudeGeometry,
  Vector2,
} from 'three';

// ─── Apple Park centre (all geometry is relative to this point) ───────────────

const CENTER_LAT = 37.3349;
const CENTER_LON = -122.0090;

// ─── Overpass API query ───────────────────────────────────────────────────────
// Tight bbox: just large enough to cover the Apple Park ring + Visitor Centre
// + Steve Jobs Theater.  Neighbouring properties sit outside this box.

const BBOX = '37.3295,-122.0145,37.3405,-122.0038';

const OVERPASS_QUERY = `[out:json][timeout:30];
(
  way["building"](${BBOX});
  relation["building"]["type"="multipolygon"](${BBOX});
);
out geom;`;

// Only render buildings whose polygon centroid lies within this radius of the
// Apple Park centre (metres).  The furthest Apple building (Visitor Centre) is
// ~340 m away; 450 m gives comfortable headroom while still excluding the
// nearest non-Apple neighbours.
const CAMPUS_RADIUS_SQ = 450 * 450;

// ─── Coordinate helpers ───────────────────────────────────────────────────────

const DEG2RAD          = Math.PI / 180;
const METERS_PER_LAT   = 111320;
const METERS_PER_LON   = 111320 * Math.cos(CENTER_LAT * DEG2RAD);

/**
 * Convert a WGS-84 lat/lon to Three.js shape XY coordinates in metres.
 *   X → east   (positive = right / east)
 *   Y → north  (positive = up on a north-up map)
 *
 * The buildings group is then rotated -90° around X so that:
 *   world X = east, world Y = up (extrusion), world Z = south.
 */
function geoToXY(lat, lon) {
  return new Vector2(
    (lon - CENTER_LON) * METERS_PER_LON,
    (lat - CENTER_LAT) * METERS_PER_LAT,
  );
}

/**
 * Return true if the centroid of pts (Vector2 array) is within CAMPUS_RADIUS
 * of the Apple Park origin.  Used to strip non-Apple buildings.
 */
function isOnCampus(pts) {
  if (pts.length === 0) return false;
  let x = 0, y = 0;
  for (const p of pts) { x += p.x; y += p.y; }
  x /= pts.length; y /= pts.length;
  return (x * x + y * y) <= CAMPUS_RADIUS_SQ;
}

/**
 * Convert an array of OSM geometry nodes {lat, lon} to Vector2 shape points.
 * Removes the duplicate closing node that OSM adds to closed ways.
 */
function nodesToXY(nodes) {
  if (!nodes || nodes.length === 0) return [];
  const pts = nodes.map(n => geoToXY(n.lat, n.lon));
  // OSM closed ways repeat the first node at the end — drop it
  if (pts.length > 1 && pts[0].distanceTo(pts[pts.length - 1]) < 0.01) {
    pts.pop();
  }
  return pts;
}

// ─── Building height ──────────────────────────────────────────────────────────

function buildingHeight(tags = {}) {
  if (tags.height) {
    const h = parseFloat(tags.height);
    if (!isNaN(h) && h > 0) return h;
  }
  if (tags['building:levels']) {
    const lv = parseFloat(tags['building:levels']);
    if (!isNaN(lv) && lv > 0) return lv * 3.5;
  }
  // Sensible defaults by type
  switch (tags.building) {
    case 'house':
    case 'detached':   return 7;
    case 'garage':     return 3;
    case 'industrial': return 12;
    case 'warehouse':  return 10;
    case 'office':     return 15;
    default:           return 10;
  }
}

// ─── Materials ────────────────────────────────────────────────────────────────

// Apple's campus buildings are mostly off-white / pearl with subtle metalness
const MAT_APPLE = new MeshStandardMaterial({
  color: 0xf4f3ef,
  metalness: 0.15,
  roughness: 0.50,
});

// Surrounding neighbourhood buildings — slightly warmer, more matte
const MAT_DEFAULT = new MeshStandardMaterial({
  color: 0xd6d5ce,
  metalness: 0.03,
  roughness: 0.80,
});

const MAT_INDUSTRIAL = new MeshStandardMaterial({
  color: 0xb8b5ae,
  metalness: 0.08,
  roughness: 0.82,
});

function chooseMaterial(tags = {}) {
  const combined = ((tags.name || '') + (tags.operator || '')).toLowerCase();
  if (combined.includes('apple')) return MAT_APPLE;
  if (tags.building === 'industrial' || tags.building === 'warehouse') return MAT_INDUSTRIAL;
  return MAT_DEFAULT;
}

// ─── Geometry builder ─────────────────────────────────────────────────────────

/**
 * Build a single ExtrudeGeometry from an outer polygon ring and optional
 * inner holes (for e.g. the Apple Park ring with its central courtyard).
 */
function buildExtruded(outerPts, holePtsArray, height) {
  if (outerPts.length < 3) return null;
  const shape = new Shape(outerPts);
  for (const hpts of holePtsArray) {
    if (hpts.length >= 3) shape.holes.push(new Path(hpts));
  }
  return new ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
}

// ─── Public loader ────────────────────────────────────────────────────────────

/**
 * Fetch OSM building footprints for the Apple Park area from the free
 * Overpass API and return a THREE.Group of extruded building meshes.
 *
 * No API key required.
 *
 * @returns {Promise<Group>}
 */
export async function loadOSMBuildings() {
  const group = new Group();
  group.name = 'osm-buildings';

  // ExtrudeGeometry extrudes along the shape's local +Z axis.
  // Rotating the group -90° around X maps that local Z onto world +Y (up),
  // so all buildings stand upright in the scene.
  group.rotation.x = -Math.PI / 2;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(OVERPASS_QUERY),
  });

  if (!res.ok) throw new Error(`Overpass API ${res.status}`);
  const data = await res.json();

  for (const el of data.elements) {
    const tags = el.tags || {};
    const mat  = chooseMaterial(tags);
    const h    = buildingHeight(tags);

    if (el.type === 'way' && el.geometry) {
      // ── Simple building polygon ──────────────────────────────────────────
      const pts = nodesToXY(el.geometry);
      // Skip anything whose centroid isn't on the Apple Park campus
      if (!isOnCampus(pts)) continue;
      const geo = buildExtruded(pts, [], h);
      if (geo) {
        const mesh = new Mesh(geo, mat);
        mesh.castShadow    = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }

    } else if (el.type === 'relation') {
      // ── Multipolygon building (outer ring + optional inner holes) ────────
      // The Apple Park main ring building is a multipolygon: the outer way
      // traces the outer edge of the ring, and the inner way traces the
      // courtyard, producing the doughnut-shaped floor plan.
      const outers = [];
      const inners = [];

      for (const m of el.members || []) {
        if (m.type !== 'way' || !m.geometry) continue;
        const pts = nodesToXY(m.geometry);
        if (m.role === 'outer') outers.push(pts);
        else if (m.role === 'inner') inners.push(pts);
      }

      if (outers.length === 0) continue;
      // Skip relations whose outer ring centroid isn't on campus
      if (!isOnCampus(outers[0])) continue;

      // First outer ring carries all inner holes
      const geo = buildExtruded(outers[0], inners, h);
      if (geo) {
        const mesh = new Mesh(geo, mat);
        mesh.castShadow    = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }

      // Any additional outer rings become separate meshes (rare)
      for (let i = 1; i < outers.length; i++) {
        const geo2 = buildExtruded(outers[i], [], h);
        if (geo2) {
          const mesh2 = new Mesh(geo2, mat);
          mesh2.castShadow    = true;
          mesh2.receiveShadow = true;
          group.add(mesh2);
        }
      }
    }
  }

  return group;
}
