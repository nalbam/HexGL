/*
 * Converts legacy Three.js JSON model format (formatVersion 3.1, JSONLoader)
 * into the modern BufferGeometry JSON format (BufferGeometryLoader).
 *
 * The legacy `faces` array is a flat stream of face records whose layout is
 * driven by a per-face bitmask `type` (see decodeFaces). Every HexGL model is
 * type 42 (triangle + material + per-vertex UV + per-vertex normal), but the
 * decoder implements the full bitmask so quads/face-uv/colors degrade safely.
 *
 * Output is non-indexed position/normal/uv attributes — materials are dropped
 * because Cityscape.buildMaterials reassigns textures per mesh.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'geometries.src');
const OUT = join(ROOT, 'public', 'geometries');

// Cityscape manifest models (edge/track.js is dead — excluded).
const MODELS = [
  'bonus/base/base.js',
  'booster/booster.js',
  'ships/feisar/feisar.js',
  'tracks/cityscape/track.js',
  'tracks/cityscape/scrapers1.js',
  'tracks/cityscape/scrapers2.js',
  'tracks/cityscape/start.js',
  'tracks/cityscape/startbanner.js',
  'tracks/cityscape/bonus/speed.js',
];

const isBitSet = (value, position) => (value & (1 << position)) !== 0;

function decodeFaces(data) {
  const { faces, vertices, normals, uvs, scale = 1 } = data;
  const uvLayer = (uvs && uvs.length > 0) ? uvs[0] : [];
  const nUvLayers = (uvs || []).length;

  const position = [];
  const normal = [];
  const uv = [];

  // Push one decoded triangle vertex (de-referenced into flat attributes).
  const emit = (vi, ni, uvi) => {
    position.push(vertices[vi * 3] * scale, vertices[vi * 3 + 1] * scale, vertices[vi * 3 + 2] * scale);
    if (ni !== null && normals.length > 0) {
      normal.push(normals[ni * 3], normals[ni * 3 + 1], normals[ni * 3 + 2]);
    } else {
      normal.push(0, 0, 0);
    }
    if (uvi !== null && uvLayer.length > 0) {
      uv.push(uvLayer[uvi * 2], uvLayer[uvi * 2 + 1]);
    } else {
      uv.push(0, 0);
    }
  };

  let offset = 0;
  let faceCount = 0;

  while (offset < faces.length) {
    const type = faces[offset++];
    const isQuad = isBitSet(type, 0);
    const hasMaterial = isBitSet(type, 1);
    const hasFaceUv = isBitSet(type, 2);
    const hasFaceVertexUv = isBitSet(type, 3);
    const hasFaceNormal = isBitSet(type, 4);
    const hasFaceVertexNormal = isBitSet(type, 5);
    const hasFaceColor = isBitSet(type, 6);
    const hasFaceVertexColor = isBitSet(type, 7);
    const nVertices = isQuad ? 4 : 3;

    const vIdx = [];
    for (let i = 0; i < nVertices; i++) vIdx.push(faces[offset++]);

    if (hasMaterial) offset++; // material index — dropped

    if (hasFaceUv) offset += nUvLayers;

    let uvIdx = null;
    if (hasFaceVertexUv) {
      uvIdx = [];
      for (let l = 0; l < nUvLayers; l++) {
        const layer = [];
        for (let i = 0; i < nVertices; i++) layer.push(faces[offset++]);
        uvIdx.push(layer);
      }
    }

    if (hasFaceNormal) offset++; // face normal index — not used (we emit per-vertex)

    let nIdx = null;
    if (hasFaceVertexNormal) {
      nIdx = [];
      for (let i = 0; i < nVertices; i++) nIdx.push(faces[offset++]);
    }

    if (hasFaceColor) offset++;
    if (hasFaceVertexColor) offset += nVertices;

    // UV/normal indices for layer 0 (HexGL uses a single UV layer).
    const uv0 = uvIdx ? uvIdx[0] : null;
    const u = (k) => (uv0 ? uv0[k] : null);
    const n = (k) => (nIdx ? nIdx[k] : null);

    if (isQuad) {
      // Split quad [0,1,2,3] into triangles [0,1,2] and [0,2,3].
      emit(vIdx[0], n(0), u(0)); emit(vIdx[1], n(1), u(1)); emit(vIdx[2], n(2), u(2));
      emit(vIdx[0], n(0), u(0)); emit(vIdx[2], n(2), u(2)); emit(vIdx[3], n(3), u(3));
    } else {
      emit(vIdx[0], n(0), u(0)); emit(vIdx[1], n(1), u(1)); emit(vIdx[2], n(2), u(2));
    }

    faceCount++;
  }

  return { position, normal, uv, offset, faceCount };
}

function toBufferGeometryJSON(position, normal, uv) {
  return {
    metadata: { version: 4.5, type: 'BufferGeometry', generator: 'convert-geometry.mjs' },
    type: 'BufferGeometry',
    data: {
      attributes: {
        position: { itemSize: 3, type: 'Float32Array', array: position, normalized: false },
        normal: { itemSize: 3, type: 'Float32Array', array: normal, normalized: false },
        uv: { itemSize: 2, type: 'Float32Array', array: uv, normalized: false },
      },
    },
  };
}

let ok = 0;
for (const rel of MODELS) {
  const data = JSON.parse(readFileSync(join(SRC, rel), 'utf8'));
  const { position, normal, uv, offset, faceCount } = decodeFaces(data);

  const expectedFaces = data.metadata.faces;
  if (offset !== data.faces.length) {
    throw new Error(`[${rel}] faces stream not fully consumed: offset ${offset} !== length ${data.faces.length}`);
  }
  if (faceCount !== expectedFaces) {
    throw new Error(`[${rel}] face count mismatch: decoded ${faceCount} !== metadata ${expectedFaces}`);
  }

  const out = join(OUT, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(toBufferGeometryJSON(position, normal, uv)));

  console.log(`OK  ${rel}  faces=${faceCount}  triVerts=${position.length / 3}`);
  ok++;
}
console.log(`\nConverted ${ok}/${MODELS.length} models -> public/geometries/`);
