/*
 * Particle system wrapper (modernized: BufferGeometry + Points).
 * Particles are simulated on the CPU as plain objects, then synced to dynamic
 * position/color attributes each frame.
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 */
import * as THREE from 'three';

export interface ParticlesOptions {
  max?: number;
  spawnRate?: number;
  spawn?: THREE.Vector3;
  velocity?: THREE.Vector3;
  randomness?: THREE.Vector3;
  force?: THREE.Vector3;
  spawnRadius?: THREE.Vector3;
  life?: number;
  friction?: number;
  color?: number;
  color2?: number;
  tint?: number;
  texture?: THREE.Texture | null;
  size?: number;
  blending?: THREE.Blending;
  depthTest?: boolean;
  transparent?: boolean;
  opacity?: number;
  position?: THREE.Vector3;
  rotation?: THREE.Vector3;
  sort?: boolean;
}

export class Particle {
  position = new THREE.Vector3(-10000, -10000, -10000);
  velocity = new THREE.Vector3();
  force = new THREE.Vector3();
  color = new THREE.Color(0x000000);
  basecolor = new THREE.Color(0x000000);
  life = 0.0;
  available = true;

  reset(): void {
    this.position.set(0, -100000, 0);
    this.velocity.set(0, 0, 0);
    this.force.set(0, 0, 0);
    this.color.setRGB(0, 0, 0);
    this.basecolor.setRGB(0, 0, 0);
    this.life = 0.0;
    this.available = true;
  }
}

export class Particles {
  material: THREE.PointsMaterial;
  max: number;
  spawnRate: number;
  spawn: THREE.Vector3;
  velocity: THREE.Vector3;
  randomness: THREE.Vector3;
  force: THREE.Vector3;
  spawnRadius: THREE.Vector3;
  life: number;
  ageing: number;
  friction: number;
  color: THREE.Color;
  color2: THREE.Color | null;
  position: THREE.Vector3;
  rotation: THREE.Vector3;

  pool: Particle[] = [];
  buffer: Particle[] = [];
  geometry!: THREE.BufferGeometry;
  system!: THREE.Points;
  private positionAttr!: THREE.BufferAttribute;
  private colorAttr!: THREE.BufferAttribute;

  constructor(opts: ParticlesOptions) {
    this.material = new THREE.PointsMaterial({
      color: opts.tint == undefined ? 0xffffff : opts.tint,
      map: opts.texture == undefined ? null : opts.texture,
      size: opts.size == undefined ? 4 : opts.size,
      blending: opts.blending == undefined ? THREE.AdditiveBlending : opts.blending,
      depthTest: opts.depthTest == undefined ? false : opts.depthTest,
      transparent: opts.transparent == undefined ? true : opts.transparent,
      vertexColors: true,
      opacity: opts.opacity == undefined ? 1.0 : opts.opacity,
      sizeAttenuation: true,
    });

    this.max = opts.max == undefined ? 1000 : opts.max;
    this.spawnRate = opts.spawnRate == undefined ? 0 : opts.spawnRate;
    this.spawn = opts.spawn == undefined ? new THREE.Vector3() : opts.spawn;
    this.velocity = opts.velocity == undefined ? new THREE.Vector3() : opts.velocity;
    this.randomness = opts.randomness == undefined ? new THREE.Vector3() : opts.randomness;
    this.force = opts.force == undefined ? new THREE.Vector3() : opts.force;
    this.spawnRadius = opts.spawnRadius == undefined ? new THREE.Vector3() : opts.spawnRadius;
    this.life = opts.life == undefined ? 60 : opts.life;
    this.ageing = 1 / this.life;
    this.friction = opts.friction == undefined ? 1.0 : opts.friction;
    this.color = new THREE.Color(opts.color == undefined ? 0xffffff : opts.color);
    this.color2 = opts.color2 == undefined ? null : new THREE.Color(opts.color2);

    this.position = opts.position == undefined ? new THREE.Vector3() : opts.position;
    this.rotation = opts.rotation == undefined ? new THREE.Vector3() : opts.rotation;

    this.build();
  }

  build(): void {
    this.geometry = new THREE.BufferGeometry();
    this.positionAttr = new THREE.BufferAttribute(new Float32Array(this.max * 3), 3);
    this.colorAttr = new THREE.BufferAttribute(new Float32Array(this.max * 3), 3);
    this.positionAttr.setUsage(THREE.DynamicDrawUsage);
    this.colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.positionAttr);
    this.geometry.setAttribute('color', this.colorAttr);

    this.pool = [];
    this.buffer = [];
    for (let i = 0; i < this.max; ++i) {
      const p = new Particle();
      this.pool.push(p);
      this.buffer.push(p);
      this.positionAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
      this.colorAttr.setXYZ(i, p.color.r, p.color.g, p.color.b);
    }

    this.system = new THREE.Points(this.geometry, this.material);
    this.system.position.copy(this.position);
    this.system.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
    this.system.frustumCulled = false;
  }

  /** Emits the given number of particles. */
  emit(count: number): void {
    const emitable = Math.min(count, this.pool.length);
    for (let i = 0; i < emitable; ++i) {
      const p = this.pool.pop()!;
      p.available = false;
      p.position.copy(this.spawn).add(this.randomVector().multiply(this.spawnRadius));
      p.velocity.copy(this.velocity).add(this.randomVector().multiply(this.randomness));
      p.force.copy(this.force);
      p.basecolor.copy(this.color);
      if (this.color2 != null) p.basecolor.lerp(this.color2, Math.random());
      p.life = 1.0;
    }
  }

  private randomVector(): THREE.Vector3 {
    return new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  }

  /** Updates particles (call in a RAF loop). dt ~1.0 */
  update(dt: number): void {
    const df = new THREE.Vector3();
    const dv = new THREE.Vector3();

    for (let i = 0; i < this.buffer.length; ++i) {
      const p = this.buffer[i];
      if (p.available) continue;

      p.life -= this.ageing;
      if (p.life <= 0 && !p.available) {
        p.reset();
        this.pool.push(p);
        continue;
      }

      const l = p.life > 0.5 ? 1.0 : p.life + 0.5;
      p.color.setRGB(l * p.basecolor.r, l * p.basecolor.g, l * p.basecolor.b);

      if (this.friction != 1.0) p.velocity.multiplyScalar(this.friction);

      df.copy(p.force).multiplyScalar(dt);
      p.velocity.add(df);

      dv.copy(p.velocity).multiplyScalar(dt);
      p.position.add(dv);
    }

    if (this.spawnRate > 0) this.emit(this.spawnRate);

    // Sync CPU particle state to GPU attributes.
    for (let i = 0; i < this.buffer.length; ++i) {
      const p = this.buffer[i];
      this.positionAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
      this.colorAttr.setXYZ(i, p.color.r, p.color.g, p.color.b);
    }
    this.positionAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;

    this.system.position.copy(this.position);
  }
}
