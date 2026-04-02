import { MathUtils } from 'three';
import { TilesRenderer } from '3d-tiles-renderer';
import {
  GoogleCloudAuthPlugin,
  GLTFExtensionsPlugin,
  TileCompressionPlugin,
  TilesFadePlugin,
  ReorientationPlugin,
} from '3d-tiles-renderer/plugins';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Apple Park, Cupertino CA
const APPLE_PARK_LAT = 37.3349;
const APPLE_PARK_LON = -122.0090;

/**
 * Initialise a TilesRenderer pointed at Google Photorealistic 3D Tiles,
 * re-centred on Apple Park.
 *
 * @param {import('three').WebGLRenderer} renderer
 * @param {import('three').Camera} camera
 * @returns {TilesRenderer}
 */
export function createTiles(renderer, camera) {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY ?? '';

  const tiles = new TilesRenderer();

  // 1. Auth — sets the root URL to Google's 3D Tiles endpoint automatically
  tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: apiKey }));

  // 2. Re-orient + re-centre tileset so Apple Park sits at Three.js origin
  tiles.registerPlugin(new ReorientationPlugin({
    lat: APPLE_PARK_LAT * MathUtils.DEG2RAD,
    lon: APPLE_PARK_LON * MathUtils.DEG2RAD,
  }));

  // 3. DRACO-aware GLTF loader (Google tiles are DRACO-compressed)
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
