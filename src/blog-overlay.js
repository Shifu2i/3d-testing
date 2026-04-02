import { Vector3 } from 'three';

// ─── Constants ────────────────────────────────────────────────────────────────

// How far from the building centre to place the panel anchor, in metres.
// Apple Park outer ring radius ≈ 231 m — place the anchor just beyond that.
// The anchor is always 90° to the side of the camera so it never covers the building.
const ORBIT_RADIUS   = 380;
const ORBIT_HEIGHT   = 55;    // metres above ground (building is ~13 m tall)

// Fraction used for lerp smoothing (0 = no movement, 1 = instant snap)
const SMOOTHING = 0.08;

// Margin from viewport edges so the panel never clips off screen
const EDGE_MARGIN = 20;

// ─── State ────────────────────────────────────────────────────────────────────

const _anchor   = new Vector3();
const _ndcPos   = new Vector3();

// Current (lerped) screen position
let currentX = window.innerWidth  * 0.85;
let currentY = window.innerHeight * 0.5;

/**
 * Set up the blog overlay panel and return an update function to be called
 * each frame from the render loop.
 *
 * @param {import('three').Camera} camera
 * @returns {{ update: (camera: import('three').Camera) => void }}
 */
export function createBlogOverlay(camera) {
  const panel = document.getElementById('blog-panel');

  // Seed initial position off to the right before the first frame
  panel.style.left = `${currentX}px`;
  panel.style.top  = `${currentY}px`;

  /**
   * Call once per frame, after controls.update() and before renderer.render().
   * Computes a panel anchor that is 90° to the camera's azimuth so it always
   * sits beside Apple Park, never in front of it.
   */
  function update() {
    // Horizontal angle of camera around origin (Y-up azimuth)
    const cameraAzimuth = Math.atan2(camera.position.x, camera.position.z);

    // Place the anchor 90° to the right of the camera direction
    const sideAngle = cameraAzimuth + Math.PI * 0.5;

    _anchor.set(
      Math.sin(sideAngle) * ORBIT_RADIUS,
      ORBIT_HEIGHT,
      Math.cos(sideAngle) * ORBIT_RADIUS,
    );

    // Project the 3-D anchor to Normalised Device Coordinates (NDC)
    _ndcPos.copy(_anchor).project(camera);

    // If the anchor is behind the camera (w < 0) flip to opposite side
    if (_ndcPos.z > 1) {
      const oppositeAngle = sideAngle + Math.PI;
      _anchor.set(
        Math.sin(oppositeAngle) * ORBIT_RADIUS,
        ORBIT_HEIGHT,
        Math.cos(oppositeAngle) * ORBIT_RADIUS,
      );
      _ndcPos.copy(_anchor).project(camera);
    }

    // Convert NDC → pixel coordinates
    const W = window.innerWidth;
    const H = window.innerHeight;
    const halfPanelW = 160 + EDGE_MARGIN;   // half of panel width (320px) + margin
    const halfPanelH = 110 + EDGE_MARGIN;   // rough half-height of panel

    let targetX = (_ndcPos.x *  0.5 + 0.5) * W;
    let targetY = (_ndcPos.y * -0.5 + 0.5) * H;

    // Clamp so the panel doesn't leave the viewport
    targetX = Math.max(halfPanelW, Math.min(W - halfPanelW, targetX));
    targetY = Math.max(halfPanelH, Math.min(H - halfPanelH, targetY));

    // Smooth interpolation so the panel glides rather than teleports
    currentX += (targetX - currentX) * SMOOTHING;
    currentY += (targetY - currentY) * SMOOTHING;

    panel.style.left = `${currentX.toFixed(1)}px`;
    panel.style.top  = `${currentY.toFixed(1)}px`;
  }

  return { update };
}
