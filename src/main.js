import {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  DirectionalLight,
  AmbientLight,
  Color,
  Fog,
} from 'three';

import { createTiles }       from './tiles.js';
import { createControls }    from './controls.js';
import { createBlogOverlay } from './blog-overlay.js';

// ─── Scene ────────────────────────────────────────────────────────────────────

const scene = new Scene();
scene.background = new Color(0x87ceeb);   // sky blue fallback
scene.fog = new Fog(0x87ceeb, 6000, 12000);

// ─── Renderer ─────────────────────────────────────────────────────────────────

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const container = document.getElementById('canvas-container');
container.appendChild(renderer.domElement);

// ─── Camera ───────────────────────────────────────────────────────────────────

const camera = new PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  10,       // near  — tight enough to show buildings close up
  80000,    // far   — wide enough to show surrounding terrain
);

// ─── Lighting (complements tile textures in low-light conditions) ─────────────

const ambient = new AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const sun = new DirectionalLight(0xfff5e0, 1.2);
sun.position.set(500, 1200, 800);
scene.add(sun);

// ─── 3D Tiles ─────────────────────────────────────────────────────────────────

const tiles = createTiles(renderer, camera);
scene.add(tiles.group);

// ─── Controls ─────────────────────────────────────────────────────────────────

const controls = createControls(camera, renderer.domElement);

// Stop auto-rotate as soon as the user touches the scene
renderer.domElement.addEventListener('pointerdown', () => {
  controls.autoRotate = false;
}, { once: true });

// ─── Blog Overlay ─────────────────────────────────────────────────────────────

const blogOverlay = createBlogOverlay(camera);

// ─── Loading Screen ───────────────────────────────────────────────────────────

const loadingEl = document.getElementById('loading');
let tilesLoaded = false;

function hideLoading() {
  if (tilesLoaded) return;
  tilesLoaded = true;
  loadingEl.classList.add('fade-out');
  setTimeout(() => { loadingEl.style.display = 'none'; }, 700);
}

// Hide loading once the first batch of tiles arrives (or after a fallback timeout)
tiles.addEventListener('load-tile-set', hideLoading);
setTimeout(hideLoading, 8000);   // fallback — show the scene even with no API key

// ─── Controls hint ────────────────────────────────────────────────────────────

const hint = document.createElement('div');
hint.className = 'controls-hint';
hint.textContent = 'Drag to orbit · Scroll to zoom';
document.body.appendChild(hint);

renderer.domElement.addEventListener('pointerdown', () => {
  hint.classList.add('hidden');
}, { once: true });

// ─── Attribution div (populated by GoogleCloudAuthPlugin) ─────────────────────

// The plugin appends attribution text/logo to an element with id="attribution"
// if one exists; our CSS already positions it at the bottom.

// ─── Resize Handler ───────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  tiles.setResolutionFromRenderer(camera, renderer);
});

// ─── Render Loop ──────────────────────────────────────────────────────────────

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  // Update tiles each frame (handles LOD, streaming, etc.)
  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);
  camera.updateMatrixWorld();
  tiles.update();

  // Reposition the blog panel to orbit beside the building
  blogOverlay.update();

  renderer.render(scene, camera);
}

animate();
