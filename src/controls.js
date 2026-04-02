import { Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// How far from the origin (Apple Park centre) the camera starts, in metres
const INITIAL_DISTANCE = 700;
const INITIAL_HEIGHT   = 350;

/**
 * Create and configure OrbitControls to orbit around Apple Park (origin).
 *
 * @param {import('three').Camera} camera
 * @param {HTMLElement} domElement
 * @returns {OrbitControls}
 */
export function createControls(camera, domElement) {
  // Position camera to look at Apple Park from the south-east at an angle
  camera.position.set(
    INITIAL_DISTANCE * 0.7,
    INITIAL_HEIGHT,
    INITIAL_DISTANCE,
  );
  camera.lookAt(new Vector3(0, 80, 0));

  const controls = new OrbitControls(camera, domElement);

  // Target — slightly above ground so we look at the mid-building
  controls.target.set(0, 80, 0);

  controls.enableDamping   = true;
  controls.dampingFactor   = 0.08;
  controls.autoRotate      = true;
  controls.autoRotateSpeed = 0.35;          // gentle auto-orbit on load

  controls.minDistance = 200;               // don't go inside the building
  controls.maxDistance = 8000;              // zoom out cap

  // Prevent going below the horizon
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI * 0.48;

  controls.enablePan = false;               // keep Apple Park centred

  return controls;
}
