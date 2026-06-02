/*
 * HexGL — chase/orbit camera.
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 * @license CC BY-NC 3.0
 */
import * as THREE from 'three';
import { rotateVectorByMatrix } from '../core/math';

export interface CameraChaseOptions {
  camera: THREE.Camera;
  target: THREE.Object3D;
  cameraCube?: THREE.Object3D | null;
  yoffest?: number;
  zoffset?: number;
  viewOffset?: number;
  lerp?: number;
}

export class CameraChase {
  dir = new THREE.Vector3(0, 0, 1);
  up = new THREE.Vector3(0, 1, 0);
  target = new THREE.Vector3();
  speedOffset = 0;
  speedOffsetMax = 10;
  speedOffsetStep = 0.05;

  modes = { CHASE: 0, ORBIT: 1 };
  mode: number;

  camera: THREE.Camera;
  targetObject: THREE.Object3D;
  cameraCube: THREE.Object3D | null;

  yoffset: number;
  zoffset: number;
  viewOffset: number;
  orbitOffset = 12;
  lerp: number;
  time = 0.0;

  constructor(opts: CameraChaseOptions) {
    this.mode = this.modes.CHASE;
    this.camera = opts.camera;
    this.targetObject = opts.target;
    this.cameraCube = opts.cameraCube == undefined ? null : opts.cameraCube;
    this.yoffset = opts.yoffest == undefined ? 8.0 : opts.yoffest;
    this.zoffset = opts.zoffset == undefined ? 10.0 : opts.zoffset;
    this.viewOffset = opts.viewOffset == undefined ? 10.0 : opts.viewOffset;
    this.lerp = opts.lerp == undefined ? 0.5 : opts.lerp;
  }

  update(dt: number, ratio: number): void {
    if (this.mode == this.modes.CHASE) {
      this.dir.set(0, 0, 1);
      this.up.set(0, 1, 0);

      rotateVectorByMatrix(this.up, this.targetObject.matrix);
      rotateVectorByMatrix(this.dir, this.targetObject.matrix);

      this.speedOffset += (this.speedOffsetMax * ratio - this.speedOffset) * Math.min(1, 0.3 * dt);

      this.target.copy(this.targetObject.position);
      this.target.sub(this.dir.multiplyScalar(this.zoffset + this.speedOffset));
      this.target.add(this.up.multiplyScalar(this.yoffset));
      this.target.y += -this.up.y + this.yoffset;
      this.camera.position.copy(this.target);

      this.camera.lookAt(this.dir.normalize().multiplyScalar(this.viewOffset).add(this.targetObject.position));
    } else if (this.mode == this.modes.ORBIT) {
      this.time += dt * 0.008;
      this.dir.set(
        Math.cos(this.time) * this.orbitOffset,
        this.yoffset / 2,
        Math.sin(this.time) * this.orbitOffset
      );
      this.target.copy(this.targetObject.position).add(this.dir);
      this.camera.position.copy(this.target);
      this.camera.lookAt(this.targetObject.position);
    }

    if (this.cameraCube != null) this.cameraCube.rotation.copy(this.camera.rotation);
  }
}
