import {
  Mesh,
  PlaneGeometry,
  MeshStandardMaterial,
  Color,
} from 'three';

/**
 * Create a large flat ground plane centred at the world origin, lying in
 * the XZ plane (Y = 0).  Sized to extend well past the OSM building area.
 *
 * @param {number} [size=5000]  Side length in metres
 * @returns {Mesh}
 */
export function createGround(size = 5000) {
  const geo = new PlaneGeometry(size, size);
  // PlaneGeometry is XY by default — rotate to lie flat in XZ
  geo.rotateX(-Math.PI / 2);

  const mat = new MeshStandardMaterial({
    // Muted sage-green that reads as grass / landscaping from above
    color: new Color(0x7b9e6e),
    metalness: 0.0,
    roughness: 0.95,
  });

  const mesh = new Mesh(geo, mat);
  mesh.name          = 'ground';
  mesh.receiveShadow = true;
  // Sink slightly below y=0 so the building bases don't z-fight with the plane
  mesh.position.y    = -0.2;

  return mesh;
}
