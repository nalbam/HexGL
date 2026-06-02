/*
 * Handles multiple scenes, cameras and render loops.
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 * @license MIT
 */
import * as THREE from 'three';

export type RenderFn = (this: RenderSetup, delta: number, renderer: THREE.WebGLRenderer) => void;

export interface RenderSetup {
  id: string;
  scene: THREE.Scene;
  camera: THREE.Camera;
  render: RenderFn;
  objects: Record<string, any>;
}

export class RenderManager {
  renderer: THREE.WebGLRenderer;
  time: number;
  renders: Record<string, RenderSetup>;
  current: RenderSetup | Record<string, never>;
  size: number;
  defaultRenderMethod: RenderFn;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.time = performance.now();
    this.renders = {};
    this.current = {};
    this.size = 0;
    this.defaultRenderMethod = function (this: RenderSetup, _delta, renderer) {
      renderer.render(this.scene, this.camera);
    };
  }

  add(id: string, scene: THREE.Scene, camera: THREE.Camera, render?: RenderFn, objects?: Record<string, any>): void {
    const setup: RenderSetup = {
      id,
      scene,
      camera,
      render: render || this.defaultRenderMethod,
      objects: objects || {},
    };
    this.renders[id] = setup;
    if (this.size === 0) this.current = setup;
    this.size++;
  }

  get(id: string): RenderSetup {
    return this.renders[id];
  }

  remove(id: string): void {
    if (id in this.renders) {
      delete this.renders[id];
      this.size--;
    }
  }

  renderCurrent(): void {
    const current = this.current as RenderSetup;
    if (current && current.render) {
      const now = performance.now();
      const delta = now - this.time;
      this.time = now;
      current.render.call(current, delta, this.renderer);
    } else {
      console.warn('RenderManager: No current render defined.');
    }
  }

  setCurrent(id: string): void {
    if (id in this.renders) {
      this.current = this.renders[id];
    } else {
      console.warn('RenderManager: Render "' + id + '" not found.');
    }
  }
}
