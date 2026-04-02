import {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  DirectionalLight,
  HemisphereLight,
  Color,
  Fog,
  PCFSoftShadowMap,
} from 'three';

import { createControls }    from './controls.js';
import { createBlogOverlay } from './blog-overlay.js';
import { loadOSMBuildings }  from './osm-buildings.js';
import { createGround }      from './ground.js';

// ─── Scene ────────────────────────────────────────────────────────────────────

const scene = new Scene();
scene.background = new Color(0x8ec8f0);         // California sky
scene.fog = new Fog(0x8ec8f0, 2000, 4500);

// ─── Renderer ─────────────────────────────────────────────────────────────────

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = PCFSoftShadowMap;

document.getElementById('canvas-container').appendChild(renderer.domElement);

// ─── Camera ───────────────────────────────────────────────────────────────────

const camera = new PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  1,      // near
  8000,   // far — wide enough to see surrounding neighbourhood
);

// ─── Lighting ─────────────────────────────────────────────────────────────────

// Hemisphere light — sky colour from above, warm ground-bounce from below
const hemi = new HemisphereLight(0xb8d8f8, 0x8aaa70, 0.65);
scene.add(hemi);

// Sun — angled from the south-west for a pleasant afternoon look
const sun = new DirectionalLight(0xfff3d0, 1.6);
sun.position.set(-400, 700, 300);
sun.castShadow = true;

// Shadow frustum sized around the Apple Park campus (~500 m radius)
const sc = sun.shadow.camera;
sc.near = 1; sc.far = 2000;
sc.left = -700; sc.right = 700;
sc.top  =  700; sc.bottom = -700;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.001;

scene.add(sun);

// ─── Ground ───────────────────────────────────────────────────────────────────

scene.add(createGround(5000));

// ─── Controls (set up early so the render loop can start immediately) ─────────

const controls = createControls(camera, renderer.domElement);

renderer.domElement.addEventListener('pointerdown', () => {
  controls.autoRotate = false;
}, { once: true });

// ─── Blog Overlay ─────────────────────────────────────────────────────────────

const blogOverlay = createBlogOverlay(camera);

// ─── Controls hint ────────────────────────────────────────────────────────────

const hint = document.createElement('div');
hint.className = 'controls-hint';
hint.textContent = 'Drag to orbit · Scroll to zoom';
document.body.appendChild(hint);
renderer.domElement.addEventListener('pointerdown', () => hint.classList.add('hidden'), { once: true });

// ─── Resize ───────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// ─── Load OSM buildings ───────────────────────────────────────────────────────

const loadingEl = document.getElementById('loading');

loadOSMBuildings()
  .then(buildingsGroup => {
    scene.add(buildingsGroup);
    loadingEl.classList.add('fade-out');
    setTimeout(() => { loadingEl.style.display = 'none'; }, 700);
  })
  .catch(err => {
    console.error('OSM buildings load failed:', err);
    const sub = loadingEl.querySelector('.loading__sub');
    if (sub) sub.textContent = 'Could not reach Overpass API — check your connection.';
    // Show the empty scene anyway after a short delay
    setTimeout(() => {
      loadingEl.classList.add('fade-out');
      setTimeout(() => { loadingEl.style.display = 'none'; }, 700);
    }, 2000);
  });

// ─── Render loop ──────────────────────────────────────────────────────────────

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  blogOverlay.update();
  renderer.render(scene, camera);
}

animate();
