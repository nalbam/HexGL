/*
 * Custom shaders kept for the modern pipeline:
 *  - hexvignette: post-process hexagonal vignette (uniform `.value` form;
 *    GLSL reserved word `sample` renamed to `sampleUv`).
 *  - cube: skybox shader (`objectMatrix` → `modelMatrix`).
 * The legacy `normal`/`normalV`/`additive` shaders are dropped — meshes now use
 * MeshStandardMaterial (see materials/NormalMaterial.ts).
 * @author Thibaut Despoulain / http://bkcore.com
 */
import * as THREE from 'three';

export interface ShaderDef {
  uniforms: Record<string, THREE.IUniform>;
  vertexShader: string;
  fragmentShader: string;
}

export const Shaders: Record<string, ShaderDef> = {
  hexvignette: {
    uniforms: {
      tDiffuse: { value: null },
      tHex: { value: null },
      size: { value: 512.0 },
      rx: { value: 1024.0 },
      ry: { value: 768.0 },
      color: { value: new THREE.Color(0x458ab1) },
    },

    vertexShader: [
      'varying vec2 vUv;',
      'void main() {',
      '  vUv = uv;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
      '}',
    ].join('\n'),

    fragmentShader: [
      'uniform float size;',
      'uniform float rx;',
      'uniform float ry;',
      'uniform vec3 color;',
      'uniform sampler2D tDiffuse;',
      'uniform sampler2D tHex;',
      'varying vec2 vUv;',
      'void main() {',
      '  vec4 vcolor = vec4(color,1.0);',
      '  vec2 hexuv;',
      '  hexuv.x = mod(vUv.x * rx, size) / size;',
      '  hexuv.y = mod(vUv.y * ry, size) / size;',
      '  vec4 hex = texture2D( tHex, hexuv );',
      '  float tolerance = 0.2;',
      '  float vignette_size = 0.6;',
      '  vec2 powers = pow(abs(vec2(vUv.x - 0.5,vUv.y - 0.5)),vec2(2.0));',
      '  float radiusSqrd = vignette_size*vignette_size;',
      '  float gradient = smoothstep(radiusSqrd-tolerance, radiusSqrd+tolerance, powers.x+powers.y);',
      '  vec2 uv = ( vUv - vec2( 0.5 ) );',
      '  vec2 sampleUv = uv * gradient * 0.5 * (1.0-hex.r);',
      '  vec4 texel = texture2D( tDiffuse, vUv-sampleUv );',
      '  gl_FragColor = (((1.0-hex.r)*vcolor) * 0.5 * gradient) + vec4( mix( texel.rgb, vcolor.xyz*0.7, dot( uv, uv ) ), texel.a );',
      '}',
    ].join('\n'),
  },

  cube: {
    uniforms: {
      tCube: { value: null },
      tFlip: { value: -1 },
    },

    vertexShader: [
      'varying vec3 vViewPosition;',
      'void main() {',
      '  vec4 mPosition = modelMatrix * vec4( position, 1.0 );',
      '  vViewPosition = cameraPosition - mPosition.xyz;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
      '}',
    ].join('\n'),

    fragmentShader: [
      'uniform samplerCube tCube;',
      'uniform float tFlip;',
      'varying vec3 vViewPosition;',
      'void main() {',
      '  vec3 wPos = cameraPosition - vViewPosition;',
      '  gl_FragColor = textureCube( tCube, vec3( tFlip * wPos.x, wPos.yz ) );',
      '}',
    ].join('\n'),
  },
};
