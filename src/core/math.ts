/*
 * Math helpers shared by the ship/camera/effects ports.
 */
import * as THREE from 'three';

/**
 * Rotates a vector in place by a matrix's rotation part (upper 3x3), preserving
 * its length — the legacy Matrix4.rotateAxis behaviour. Unlike
 * Vector3.transformDirection this does NOT normalize, which matters for the
 * length-5 gradient/tilt probes in ShipControls.heightCheck.
 */
export function rotateVectorByMatrix(v: THREE.Vector3, m: THREE.Matrix4): THREE.Vector3 {
  const e = m.elements;
  const x = v.x, y = v.y, z = v.z;
  v.x = e[0] * x + e[4] * y + e[8] * z;
  v.y = e[1] * x + e[5] * y + e[9] * z;
  v.z = e[2] * x + e[6] * y + e[10] * z;
  return v;
}
