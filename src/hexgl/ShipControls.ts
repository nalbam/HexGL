/*
 * HexGL — ship physics and input.
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 * @license CC BY-NC 3.0
 */
import * as THREE from 'three';
import { Audio } from '../core/Audio';
import type { ImageDataLoader } from '../core/ImageData';
import { TouchController } from '../controllers/TouchController';
import { OrientationController } from '../controllers/OrientationController';
import { GamepadController } from '../controllers/GamepadController';
import { rotateVectorByMatrix } from '../core/math';

export interface ShipControlsContext {
  document: Document | HTMLElement;
  width: number;
  height: number;
  controlType: number;
  restart: () => void;
}

const SCALE_ONE = new THREE.Vector3(1, 1, 1);

export class ShipControls {
  active = true;
  destroyed = false;
  falling = false;

  dom: Document | HTMLElement;
  mesh: THREE.Object3D | null = null;

  epsilon = 0.00000001;
  zero = new THREE.Vector3(0, 0, 0);
  airResist = 0.02;
  airDrift = 0.1;
  thrust = 0.02;
  airBrake = 0.02;
  maxSpeed = 7.0;
  boosterSpeed = this.maxSpeed * 0.2;
  boosterDecay = 0.01;
  angularSpeed = 0.005;
  airAngularSpeed = 0.0065;
  repulsionRatio = 0.5;
  repulsionCap = 2.5;
  repulsionLerp = 0.1;
  collisionSpeedDecrease = 0.8;
  collisionSpeedDecreaseCoef = 0.8;
  maxShield = 1.0;
  shieldDelay = 60;
  shieldTiming = 0;
  shieldDamage = 0.25;
  driftLerp = 0.35;
  angularLerp = 0.35;

  movement = new THREE.Vector3(0, 0, 0);
  rotation = new THREE.Vector3(0, 0, 0);
  roll = 0.0;
  rollAxis = new THREE.Vector3();
  drift = 0.0;
  speed = 0.0;
  speedRatio = 0.0;
  boost = 0.0;
  shield = 1.0;
  angular = 0.0;

  currentVelocity = new THREE.Vector3();
  quaternion = new THREE.Quaternion();
  dummy = new THREE.Object3D();

  collisionMap: ImageDataLoader | null = null;
  collisionPixelRatio = 1.0;
  collisionDetection = false;
  collisionPreviousPosition = new THREE.Vector3();

  heightMap: ImageDataLoader | null = null;
  heightPixelRatio = 1.0;
  heightBias = 0.0;
  heightLerp = 0.4;
  heightScale = 1.0;

  rollAngle = 0.6;
  rollLerp = 0.08;
  rollDirection = new THREE.Vector3(0, 0, 1);

  gradient = 0.0;
  gradientTarget = 0.0;
  gradientLerp = 0.05;
  gradientScale = 4.0;
  gradientVector = new THREE.Vector3(0, 0, 5);
  gradientAxis = new THREE.Vector3(1, 0, 0);

  tilt = 0.0;
  tiltTarget = 0.0;
  tiltLerp = 0.05;
  tiltScale = 4.0;
  tiltVector = new THREE.Vector3(5, 0, 0);
  tiltAxis = new THREE.Vector3(0, 0, 1);

  repulsionVLeft = new THREE.Vector3(1, 0, 0);
  repulsionVRight = new THREE.Vector3(-1, 0, 0);
  repulsionVFront = new THREE.Vector3(0, 0, 1);
  repulsionVScale = 4.0;
  repulsionAmount = 0.0;
  repulsionForce = new THREE.Vector3();

  fallVector = new THREE.Vector3(0, -20, 0);

  resetPos: THREE.Vector3 | null = null;
  resetRot: THREE.Vector3 | null = null;

  key = { forward: false, backward: false, left: false, right: false, ltrigger: false, rtrigger: false, use: false };
  collision = { front: false, left: false, right: false };

  touchController: TouchController | null = null;
  orientationController: OrientationController | null = null;
  gamepadController: GamepadController | null = null;
  leapController: any = null;
  leapBridge: any = null;
  leapInfo: HTMLElement | null = null;

  private tmpMatrix = new THREE.Matrix4();

  constructor(ctx: ShipControlsContext) {
    const self = this;
    const domElement = ctx.document;
    this.dom = domElement;

    if (ctx.controlType == 1 && TouchController.isCompatible()) {
      this.touchController = new TouchController(domElement as HTMLElement, ctx.width / 2, (_state, touch, event) => {
        if (event.touches.length >= 4) window.location.reload();
        else if (event.touches.length == 3) ctx.restart();
        else if (touch.clientX > ctx.width / 2) {
          self.key.forward = event.type !== 'touchend';
        }
      });
    } else if (ctx.controlType == 4 && OrientationController.isCompatible()) {
      this.orientationController = new OrientationController(domElement as HTMLElement, true, (_state, _touch, event) => {
        if (event.touches.length >= 4) window.location.reload();
        else if (event.touches.length == 3) ctx.restart();
        else if (event.touches.length < 1) self.key.forward = false;
        else self.key.forward = true;
      });
    } else if (ctx.controlType == 3 && GamepadController.isCompatible()) {
      this.gamepadController = new GamepadController((controller) => {
        if (controller.select) ctx.restart();
        else self.key.forward = (controller.acceleration as any) > 0;
        self.key.ltrigger = (controller.ltrigger as any) > 0;
        self.key.rtrigger = (controller.rtrigger as any) > 0;
        self.key.left = controller.lstickx < -0.1;
        self.key.right = controller.lstickx > 0.1;
      });
    } else if (ctx.controlType == 2) {
      this.initLeap();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.keyCode) {
        case 38: self.key.forward = true; break;
        case 40: self.key.backward = true; break;
        case 37: self.key.left = true; break;
        case 39: self.key.right = true; break;
        case 81: self.key.ltrigger = true; break;
        case 65: self.key.ltrigger = true; break;
        case 68: self.key.rtrigger = true; break;
        case 69: self.key.rtrigger = true; break;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.keyCode) {
        case 38: self.key.forward = false; break;
        case 40: self.key.backward = false; break;
        case 37: self.key.left = false; break;
        case 39: self.key.right = false; break;
        case 81: self.key.ltrigger = false; break;
        case 65: self.key.ltrigger = false; break;
        case 68: self.key.rtrigger = false; break;
        case 69: self.key.rtrigger = false; break;
      }
    };

    domElement.addEventListener('keydown', onKeyDown as EventListener, false);
    domElement.addEventListener('keyup', onKeyUp as EventListener, false);
  }

  private initLeap(): void {
    const Leap = (window as any).Leap;
    if (Leap == null) throw new Error('Unable to reach LeapJS!');

    const leapInfo = (this.leapInfo = document.getElementById('leapinfo'));
    let isServerConnected = false;
    const lb = (this.leapBridge = { isConnected: true, hasHands: false, palmNormal: [0, 0, 0] });

    const updateInfo = () => {
      if (!leapInfo) return;
      if (!isServerConnected) {
        leapInfo.innerHTML = 'Waiting for the Leap Motion Controller server...';
        leapInfo.style.display = 'block';
      } else if (lb.isConnected && lb.hasHands) {
        leapInfo.style.display = 'none';
      } else if (!lb.isConnected) {
        leapInfo.innerHTML = 'Please connect your Leap Motion Controller.';
        leapInfo.style.display = 'block';
      } else if (!lb.hasHands) {
        leapInfo.innerHTML = 'Put your hand over the Leap Motion Controller to play.';
        leapInfo.style.display = 'block';
      }
    };
    updateInfo();

    const lc = (this.leapController = new Leap.Controller({ enableGestures: false }));
    lc.on('connect', () => { isServerConnected = true; updateInfo(); });
    lc.on('deviceConnected', () => { lb.isConnected = true; updateInfo(); });
    lc.on('deviceDisconnected', () => { lb.isConnected = false; updateInfo(); });
    lc.on('frame', (frame: any) => {
      if (!lb.isConnected) return;
      const hand = frame.hands[0];
      if (typeof hand === 'undefined') {
        if (lb.hasHands) { lb.hasHands = false; updateInfo(); }
        lb.palmNormal = [0, 0, 0];
      } else {
        if (!lb.hasHands) { lb.hasHands = true; updateInfo(); }
        lb.palmNormal = hand.palmNormal;
      }
    });
    lc.connect();
  }

  control(threeMesh: THREE.Object3D): void {
    this.mesh = threeMesh;
    this.mesh.matrixAutoUpdate = false;
    // mesh.position is re-derived from dummy.matrix via applyMatrix4 every frame,
    // so the dummy keeps its own position vector (seeded from the mesh here).
    this.dummy.position.copy(this.mesh.position);
  }

  reset(position: THREE.Vector3, rotation: THREE.Vector3): void {
    this.resetPos = position;
    this.resetRot = rotation;
    this.movement.set(0, 0, 0);
    this.rotation.copy(rotation);
    this.roll = 0.0;
    this.drift = 0.0;
    this.speed = 0.0;
    this.speedRatio = 0.0;
    this.boost = 0.0;
    this.shield = this.maxShield;
    this.destroyed = false;

    this.dummy.position.copy(position);
    this.quaternion.set(rotation.x, rotation.y, rotation.z, 1).normalize();
    this.dummy.quaternion.set(0, 0, 0, 1);
    this.dummy.quaternion.multiply(this.quaternion);

    this.dummy.matrix.compose(this.dummy.position, this.dummy.quaternion, SCALE_ONE);

    this.mesh!.matrix.identity();
    this.mesh!.applyMatrix4(this.dummy.matrix);
  }

  terminate(): void {
    this.destroy();
    if (this.leapController != null) {
      this.leapController.disconnect();
      if (this.leapInfo) this.leapInfo.style.display = 'none';
    }
  }

  destroy(): void {
    Audio.play('destroyed');
    Audio.stop('bg');
    Audio.stop('wind');
    this.active = false;
    this.destroyed = true;
    this.collision.front = false;
    this.collision.left = false;
    this.collision.right = false;
  }

  fall(): void {
    this.active = false;
    this.collision.front = false;
    this.collision.left = false;
    this.collision.right = false;
    this.falling = true;
    setTimeout(() => {
      this.destroyed = true;
    }, 1500);
  }

  update(dt: number): void {
    if (this.falling) {
      this.mesh!.position.add(this.fallVector);
      return;
    }

    this.rotation.y = 0;
    this.movement.set(0, 0, 0);
    this.drift += (0.0 - this.drift) * this.driftLerp;
    this.angular += (0.0 - this.angular) * this.angularLerp * 0.5;

    let rollAmount = 0.0;
    let angularAmount = 0.0;
    let yawLeap = 0.0;

    if (this.leapBridge != null && this.leapBridge.hasHands) {
      rollAmount -= this.leapBridge.palmNormal[0] * 3.5 * this.rollAngle;
      yawLeap = -this.leapBridge.palmNormal[2] * 0.6;
    }

    if (this.active) {
      if (this.touchController != null) {
        angularAmount -= (this.touchController.stickVector.x / 100) * this.angularSpeed * dt;
        rollAmount += (this.touchController.stickVector.x / 100) * this.rollAngle;
      } else if (this.orientationController != null) {
        angularAmount += (this.orientationController.beta / 45) * this.angularSpeed * dt;
        rollAmount -= (this.orientationController.beta / 45) * this.rollAngle;
      } else if (this.gamepadController != null && this.gamepadController.updateAvailable()) {
        angularAmount -= this.gamepadController.lstickx * this.angularSpeed * dt;
        rollAmount += this.gamepadController.lstickx * this.rollAngle;
      } else if (this.leapBridge != null && this.leapBridge.hasHands) {
        angularAmount += this.leapBridge.palmNormal[0] * 2 * this.angularSpeed * dt;
        this.speed += Math.max(0.0, 0.5 + this.leapBridge.palmNormal[2]) * 3 * this.thrust * dt;
      } else {
        if (this.key.left) {
          angularAmount += this.angularSpeed * dt;
          rollAmount -= this.rollAngle;
        }
        if (this.key.right) {
          angularAmount -= this.angularSpeed * dt;
          rollAmount += this.rollAngle;
        }
      }

      if (this.key.forward) this.speed += this.thrust * dt;
      else this.speed -= this.airResist * dt;

      if (this.key.ltrigger) {
        if (this.key.left) angularAmount += this.airAngularSpeed * dt;
        else angularAmount += this.airAngularSpeed * 0.5 * dt;
        this.speed -= this.airBrake * dt;
        this.drift += (this.airDrift - this.drift) * this.driftLerp;
        this.movement.x += this.speed * this.drift * dt;
        if (this.drift > 0.0) this.movement.z -= this.speed * this.drift * dt;
        rollAmount -= this.rollAngle * 0.7;
      }
      if (this.key.rtrigger) {
        if (this.key.right) angularAmount -= this.airAngularSpeed * dt;
        else angularAmount -= this.airAngularSpeed * 0.5 * dt;
        this.speed -= this.airBrake * dt;
        this.drift += (-this.airDrift - this.drift) * this.driftLerp;
        this.movement.x += this.speed * this.drift * dt;
        if (this.drift < 0.0) this.movement.z += this.speed * this.drift * dt;
        rollAmount += this.rollAngle * 0.7;
      }
    }

    this.angular += (angularAmount - this.angular) * this.angularLerp;
    this.rotation.y = this.angular;

    this.speed = Math.max(0.0, Math.min(this.speed, this.maxSpeed));
    this.speedRatio = this.speed / this.maxSpeed;
    this.movement.z += this.speed * dt;

    if (this.repulsionForce.lengthSq() === 0) {
      this.repulsionForce.set(0, 0, 0);
    } else {
      if (this.repulsionForce.z != 0.0) this.movement.z = 0;
      this.movement.add(this.repulsionForce);
      this.repulsionForce.lerp(this.zero, dt > 1.5 ? this.repulsionLerp * 2 : this.repulsionLerp);
    }

    this.collisionPreviousPosition.copy(this.dummy.position);

    this.boosterCheck(dt);

    this.dummy.translateX(this.movement.x);
    this.dummy.translateZ(this.movement.z);

    this.heightCheck(dt);
    this.dummy.translateY(this.movement.y);

    this.currentVelocity.copy(this.dummy.position).sub(this.collisionPreviousPosition);

    this.collisionCheck(dt);

    this.quaternion.set(this.rotation.x, this.rotation.y, this.rotation.z, 1).normalize();
    this.dummy.quaternion.multiply(this.quaternion);

    this.dummy.matrix.compose(this.dummy.position, this.dummy.quaternion, SCALE_ONE);

    if (this.shield <= 0.0) {
      this.shield = 0.0;
      this.destroy();
    }

    if (this.mesh != null) {
      this.mesh.matrix.identity();

      // Gradient (mesh only, no dummy physics impact)
      const gradientDelta = (this.gradientTarget - (yawLeap + this.gradient)) * this.gradientLerp;
      if (Math.abs(gradientDelta) > this.epsilon) this.gradient += gradientDelta;
      if (Math.abs(this.gradient) > this.epsilon) {
        this.gradientAxis.set(1, 0, 0);
        this.rotateMatrixByAxis(this.mesh.matrix, this.gradientAxis, this.gradient);
      }

      // Tilting
      const tiltDelta = (this.tiltTarget - this.tilt) * this.tiltLerp;
      if (Math.abs(tiltDelta) > this.epsilon) this.tilt += tiltDelta;
      if (Math.abs(this.tilt) > this.epsilon) {
        this.tiltAxis.set(0, 0, 1);
        this.rotateMatrixByAxis(this.mesh.matrix, this.tiltAxis, this.tilt);
      }

      // Rolling
      const rollDelta = (rollAmount - this.roll) * this.rollLerp;
      if (Math.abs(rollDelta) > this.epsilon) this.roll += rollDelta;
      if (Math.abs(this.roll) > this.epsilon) {
        this.rollAxis.copy(this.rollDirection);
        this.rotateMatrixByAxis(this.mesh.matrix, this.rollAxis, this.roll);
      }

      this.mesh.applyMatrix4(this.dummy.matrix);
      this.mesh.updateMatrixWorld(true);
    }

    // Update listener position
    Audio.setListenerPos(this.movement);
    Audio.setListenerVelocity(this.currentVelocity);
  }

  teleport(pos: THREE.Vector3, quat: THREE.Quaternion): void {
    this.quaternion.copy(quat);
    this.dummy.quaternion.copy(this.quaternion);

    this.dummy.position.copy(pos);
    this.dummy.matrix.compose(this.dummy.position, this.dummy.quaternion, SCALE_ONE);

    if (this.mesh != null) {
      this.mesh.matrix.identity();

      const gradientDelta = (this.gradientTarget - this.gradient) * this.gradientLerp;
      if (Math.abs(gradientDelta) > this.epsilon) this.gradient += gradientDelta;
      if (Math.abs(this.gradient) > this.epsilon) {
        this.gradientAxis.set(1, 0, 0);
        this.rotateMatrixByAxis(this.mesh.matrix, this.gradientAxis, this.gradient);
      }

      const tiltDelta = (this.tiltTarget - this.tilt) * this.tiltLerp;
      if (Math.abs(tiltDelta) > this.epsilon) this.tilt += tiltDelta;
      if (Math.abs(this.tilt) > this.epsilon) {
        this.tiltAxis.set(0, 0, 1);
        this.rotateMatrixByAxis(this.mesh.matrix, this.tiltAxis, this.tilt);
      }

      this.mesh.applyMatrix4(this.dummy.matrix);
      this.mesh.updateMatrixWorld(true);
    }
  }

  /** mesh.matrix = mesh.matrix * rotation(axis, angle) — legacy Matrix4.rotateByAxis. */
  private rotateMatrixByAxis(matrix: THREE.Matrix4, axis: THREE.Vector3, angle: number): void {
    this.tmpMatrix.makeRotationAxis(axis, angle);
    matrix.multiply(this.tmpMatrix);
  }

  boosterCheck(dt: number): boolean {
    if (!this.collisionMap || !this.collisionMap.loaded) return false;

    this.boost -= this.boosterDecay * dt;
    if (this.boost < 0) {
      this.boost = 0.0;
      Audio.stop('boost');
    }

    const x = Math.round(this.collisionMap.pixels!.width / 2 + this.dummy.position.x * this.collisionPixelRatio);
    const z = Math.round(this.collisionMap.pixels!.height / 2 + this.dummy.position.z * this.collisionPixelRatio);

    const color = this.collisionMap.getPixel(x, z);
    if (color.r == 255 && color.g < 127 && color.b < 127) {
      Audio.play('boost');
      this.boost = this.boosterSpeed;
    }

    this.movement.z += this.boost * dt;
    return true;
  }

  collisionCheck(dt: number): boolean {
    if (!this.collisionDetection || !this.collisionMap || !this.collisionMap.loaded) return false;

    if (this.shieldDelay > 0) this.shieldDelay -= dt;

    this.collision.left = false;
    this.collision.right = false;
    this.collision.front = false;

    const x = Math.round(this.collisionMap.pixels!.width / 2 + this.dummy.position.x * this.collisionPixelRatio);
    const z = Math.round(this.collisionMap.pixels!.height / 2 + this.dummy.position.z * this.collisionPixelRatio);
    const pos = new THREE.Vector3(x, 0, z);

    const collision = this.collisionMap.getPixelBilinear(x, z);

    if (collision.r < 255) {
      Audio.play('crash');

      // Shield
      const sr = this.getRealSpeed() / this.maxSpeed;
      this.shield -= sr * sr * 0.8 * this.shieldDamage;

      // Repulsion
      this.repulsionVLeft.set(1, 0, 0);
      this.repulsionVRight.set(-1, 0, 0);
      rotateVectorByMatrix(this.repulsionVLeft, this.dummy.matrix);
      rotateVectorByMatrix(this.repulsionVRight, this.dummy.matrix);
      this.repulsionVLeft.multiplyScalar(this.repulsionVScale);
      this.repulsionVRight.multiplyScalar(this.repulsionVScale);

      const lPos = this.repulsionVLeft.add(pos);
      const rPos = this.repulsionVRight.add(pos);
      const lCol = this.collisionMap.getPixel(Math.round(lPos.x), Math.round(lPos.z)).r;
      const rCol = this.collisionMap.getPixel(Math.round(rPos.x), Math.round(rPos.z)).r;

      this.repulsionAmount = Math.max(0.8, Math.min(this.repulsionCap, this.speed * this.repulsionRatio));

      if (rCol > lCol) {
        // Repulse right
        this.repulsionForce.x += -this.repulsionAmount;
        this.collision.left = true;
      } else if (rCol < lCol) {
        // Repulse left
        this.repulsionForce.x += this.repulsionAmount;
        this.collision.right = true;
      } else {
        this.repulsionForce.z += -this.repulsionAmount * 4;
        this.collision.front = true;
        this.speed = 0;
      }

      // DIRTY GAMEOVER
      if (rCol < 128 && lCol < 128) {
        const fCol = this.collisionMap.getPixel(Math.round(pos.x + 2), Math.round(pos.z + 2)).r;
        if (fCol < 128) {
          console.log('GAMEOVER');
          this.fall();
        }
      }

      this.speed *= this.collisionSpeedDecrease;
      this.speed *= 1 - this.collisionSpeedDecreaseCoef * (1 - collision.r / 255);
      this.boost = 0;

      return true;
    }
    return false;
  }

  heightCheck(_dt: number): boolean {
    if (!this.heightMap || !this.heightMap.loaded) return false;

    let x = this.heightMap.pixels!.width / 2 + this.dummy.position.x * this.heightPixelRatio;
    let z = this.heightMap.pixels!.height / 2 + this.dummy.position.z * this.heightPixelRatio;
    const height = this.heightMap.getPixelFBilinear(x, z) / this.heightScale + this.heightBias;

    if (height < 16777) {
      const delta = height - this.dummy.position.y;
      if (delta > 0) this.movement.y += delta;
      else this.movement.y += delta * this.heightLerp;
    }

    // gradient
    this.gradientVector.set(0, 0, 5);
    rotateVectorByMatrix(this.gradientVector, this.dummy.matrix);
    this.gradientVector.add(this.dummy.position);

    x = this.heightMap.pixels!.width / 2 + this.gradientVector.x * this.heightPixelRatio;
    z = this.heightMap.pixels!.height / 2 + this.gradientVector.z * this.heightPixelRatio;

    let nheight = this.heightMap.getPixelFBilinear(x, z) / this.heightScale + this.heightBias;
    if (nheight < 16777) this.gradientTarget = -Math.atan2(nheight - height, 5.0) * this.gradientScale;

    // tilt
    this.tiltVector.set(5, 0, 0);
    rotateVectorByMatrix(this.tiltVector, this.dummy.matrix);
    this.tiltVector.add(this.dummy.position);

    x = this.heightMap.pixels!.width / 2 + this.tiltVector.x * this.heightPixelRatio;
    z = this.heightMap.pixels!.height / 2 + this.tiltVector.z * this.heightPixelRatio;

    nheight = this.heightMap.getPixelFBilinear(x, z) / this.heightScale + this.heightBias;

    if (nheight >= 16777) {
      // If right projection out of bounds, try left projection
      this.tiltVector.sub(this.dummy.position).multiplyScalar(-1).add(this.dummy.position);
      x = this.heightMap.pixels!.width / 2 + this.tiltVector.x * this.heightPixelRatio;
      z = this.heightMap.pixels!.height / 2 + this.tiltVector.z * this.heightPixelRatio;
      nheight = this.heightMap.getPixelFBilinear(x, z) / this.heightScale + this.heightBias;
    }

    if (nheight < 16777) this.tiltTarget = Math.atan2(nheight - height, 5.0) * this.tiltScale;
    return true;
  }

  getRealSpeed(scale?: number): number {
    return Math.round((this.speed + this.boost) * (scale == undefined ? 1 : scale));
  }

  getRealSpeedRatio(): number {
    return Math.min(this.maxSpeed, this.speed + this.boost) / this.maxSpeed;
  }

  getSpeedRatio(): number {
    return (this.speed + this.boost) / this.maxSpeed;
  }

  getBoostRatio(): number {
    return this.boost / this.boosterSpeed;
  }

  getShieldRatio(): number {
    return this.shield / this.maxShield;
  }

  getShield(scale?: number): number {
    return Math.round(this.shield * (scale == undefined ? 1 : scale));
  }

  getPosition(): THREE.Vector3 {
    return this.dummy.position;
  }

  getQuaternion(): THREE.Quaternion {
    return this.dummy.quaternion;
  }
}
