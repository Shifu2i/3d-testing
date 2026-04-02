import { Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Apple Park ring building:  outer radius ~231 m, height ~13 m
// Start the camera ~600 m away, ~280 m up — good first-look angle
const INITIAL_X   =  420;
const INITIAL_Y   =  280;
const INITIAL_Z   =  540;

// Orbit target — slightly above ground so we look at mid-building
const TARGET_Y    = 20;

/**
 * Create and configure OrbitControls orbiting around Apple Park (world origin).
 *
 * @param {import('three').Camera} camera
 * @param {HTMLElement} domElement
 * @returns {OrbitControls}
 */
export function createControls(camera, domElement) {
  camera.position.set(INITIAL_X, INITIAL_Y, INITIAL_Z);
  camera.lookAt(new Vector3(0, TARGET_Y, 0));

  const controls = new OrbitControls(camera, domElement);

  controls.target.set(0, TARGET_Y, 0);

  controls.enableDamping   = true;
  controls.dampingFactor   = 0.07;

  // Gentle auto-rotate so visitors immediately see the 3D form
  controls.autoRotate      = true;
  controls.autoRotateSpeed = 0.4;

  // Distance limits
  controls.minDistance = 80;      // close enough to see building detail
  controls.maxDistance = 3000;    // far enough to see surrounding area

  // Vertical angle limits — keep camera above the horizon
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI * 0.46;

  // Keep Apple Park centred — no free panning
  controls.enablePan = false;

  return controls;
}
