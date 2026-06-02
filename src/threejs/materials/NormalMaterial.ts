/*
 * Replacement for the legacy per-pixel `normal`/`normalV` ShaderMaterial, which
 * relied on the removed fixed-light-count uniform system. MeshStandardMaterial
 * gives correct modern lighting + shadows and computes tangents from
 * derivatives, so no `tangent` attribute is needed.
 *
 * The four inputs that mattered are preserved: diffuse(map), normal(normalMap),
 * specular(roughnessMap, approximate), and cube reflection(envMap). The
 * roughness/metalness/envMapIntensity/normalScale knobs are exposed for retune.
 */
import * as THREE from 'three';

export interface NormalMaterialOptions {
  diffuse?: THREE.Texture | null;
  normal?: THREE.Texture | null;
  specular?: THREE.Texture | null;
  cube?: THREE.CubeTexture | null;
  normalScale?: number;
  reflectivity?: number;
  metal?: boolean;
  // Retune knobs:
  roughness?: number;
  metalness?: number;
}

export function createNormalMaterial(opts: NormalMaterialOptions = {}): THREE.MeshStandardMaterial {
  const normalScale = opts.normalScale == null ? 1.0 : opts.normalScale;
  const reflectivity = opts.reflectivity == null ? 0.9 : opts.reflectivity;
  const metal = opts.metal == null ? false : opts.metal;

  const material = new THREE.MeshStandardMaterial({
    map: opts.diffuse ?? null,
    normalMap: opts.normal ?? null,
    normalScale: new THREE.Vector2(normalScale, normalScale),
    roughnessMap: opts.specular ?? null,
    roughness: opts.roughness == null ? 0.6 : opts.roughness,
    metalness: opts.metalness == null ? (metal ? 0.6 : 0.1) : opts.metalness,
    envMap: opts.cube ?? null,
    envMapIntensity: opts.cube ? reflectivity : 0,
  });

  return material;
}
