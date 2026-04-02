import { MathUtils } from 'three';
import { TilesRenderer } from '3d-tiles-renderer';
import {
  CesiumIonAuthPlugin,
  GLTFExtensionsPlugin,
  TileCompressionPlugin,
  TilesFadePlugin,
  ReorientationPlugin,
} from '3d-tiles-renderer/plugins';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Apple Park, Cupertino CA
const APPLE_PARK_LAT = 37.3349;
const APPLE_PARK_LON = -122.0090;

// Cesium Ion asset IDs (free tier)
// 96188 = Cesium OSM Buildings — global 3D building dataset derived from OpenStreetMap
const CESIUM_OSM_BUILDINGS_ASSET_ID = 96188;

/**
 * Initialise a TilesRenderer pointed at Cesium Ion OSM Buildings,
 * re-centred on Apple Park.
 *
 * Sign up free at https://ion.cesium.com to get an access token.
 * Set VITE_CESIUM_ION_TOKEN in .env.
 *
 * @param {import('three').WebGLRenderer} renderer
 * @param {import('three').Camera} camera
 * @returns {TilesRenderer}
 */
export function createTiles(renderer, camera) {
  const token = import.meta.env.VITE_CESIUM_ION_TOKEN ?? '';

  const tiles = new TilesRenderer();

  // 1. Auth — resolves the asset endpoint from Cesium Ion automatically
  tiles.registerPlugin(new CesiumIonAuthPlugin({
    apiToken: token,
    assetId: CESIUM_OSM_BUILDINGS_ASSET_ID,
  }));

  // 2. Re-orient + re-centre tileset so Apple Park sits at Three.js origin
  tiles.registerPlugin(new ReorientationPlugin({
    lat: APPLE_PARK_LAT * MathUtils.DEG2RAD,
    lon: APPLE_PARK_LON * MathUtils.DEG2RAD,
  }));

  // 3. DRACO-aware GLTF loader (OSM Buildings tiles are DRACO-compressed)
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  tiles.registerPlugin(new GLTFExtensionsPlugin({ dracoLoader }));

  // 4. Compression & fade for smoother LOD transitions
  tiles.registerPlugin(new TileCompressionPlugin());
  tiles.registerPlugin(new TilesFadePlugin());

  // Wire up renderer
  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);

  return tiles;
}
