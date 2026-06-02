/*
 * HexGL — Cityscape track definition (assets, materials, scene graph).
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 * @license CC BY-NC 3.0
 */
import * as THREE from 'three';
import { Loader } from '../../threejs/Loader';
import type { LoaderCallbacks } from '../../threejs/Loader';
import { Shaders } from '../../threejs/Shaders';
import { createNormalMaterial } from '../../threejs/materials/NormalMaterial';
import { ShipControls } from '../ShipControls';
import { ShipEffects } from '../ShipEffects';
import { CameraChase } from '../CameraChase';
import type { ImageDataLoader } from '../../core/ImageData';

interface TrackDef {
  lib: Loader | null;
  materials: Record<string, THREE.Material>;
  name: string;
  checkpoints: { list: number[]; start: number; last: number };
  spawn: { x: number; y: number; z: number };
  spawnRotation: { x: number; y: number; z: number };
  analyser: ImageDataLoader | null;
  pixelRatio: number;
  load(opts: LoaderCallbacks, quality: number): void;
  buildMaterials(quality: number): void;
  buildScenes(ctx: any, quality: number): void;
}

export const Cityscape: TrackDef = {
  lib: null,
  materials: {},

  name: 'Cityscape',

  checkpoints: { list: [0, 1, 2], start: 0, last: 2 },

  spawn: { x: -1134 * 2, y: 387, z: -443 * 2 },
  spawnRotation: { x: 0, y: 0, z: 0 },

  analyser: null,
  pixelRatio: 2048.0 / 6000.0,

  load(opts, quality) {
    this.lib = new Loader(opts);

    if (quality < 2) {
      // LOW
      this.lib.load({
        textures: {
          hex: 'textures/hud/hex.jpg',
          spark: 'textures/particles/spark.png',
          cloud: 'textures/particles/cloud.png',
          'ship.feisar.diffuse': 'textures/ships/feisar/diffuse.jpg',
          'booster.diffuse': 'textures/ships/feisar/booster/booster.png',
          'booster.sprite': 'textures/ships/feisar/booster/boostersprite.jpg',
          'track.cityscape.diffuse': 'textures/tracks/cityscape/diffuse.jpg',
          'track.cityscape.scrapers1.diffuse': 'textures/tracks/cityscape/scrapers1/diffuse.jpg',
          'track.cityscape.scrapers2.diffuse': 'textures/tracks/cityscape/scrapers2/diffuse.jpg',
          'track.cityscape.start.diffuse': 'textures/tracks/cityscape/start/diffuse.jpg',
          'track.cityscape.start.banner': 'textures/tracks/cityscape/start/start.jpg',
          'bonus.base.diffuse': 'textures/bonus/base/diffuse.jpg',
        },
        texturesCube: { 'skybox.dawnclouds': 'textures/skybox/dawnclouds/%1.jpg' },
        geometries: {
          'bonus.base': 'geometries/bonus/base/base.js',
          booster: 'geometries/booster/booster.js',
          'ship.feisar': 'geometries/ships/feisar/feisar.js',
          'track.cityscape': 'geometries/tracks/cityscape/track.js',
          'track.cityscape.scrapers1': 'geometries/tracks/cityscape/scrapers1.js',
          'track.cityscape.scrapers2': 'geometries/tracks/cityscape/scrapers2.js',
          'track.cityscape.start': 'geometries/tracks/cityscape/start.js',
          'track.cityscape.start.banner': 'geometries/tracks/cityscape/startbanner.js',
          'track.cityscape.bonus.speed': 'geometries/tracks/cityscape/bonus/speed.js',
        },
        analysers: {
          'track.cityscape.collision': 'textures/tracks/cityscape/collision.png',
          'track.cityscape.height': 'textures/tracks/cityscape/height.png',
        },
        images: {
          'hud.bg': 'textures/hud/hud-bg.png',
          'hud.speed': 'textures/hud/hud-fg-speed.png',
          'hud.shield': 'textures/hud/hud-fg-shield.png',
        },
        sounds: {
          bg: { src: 'audio/bg.ogg', loop: true, usePanner: false },
          crash: { src: 'audio/crash.ogg', loop: false, usePanner: true },
          destroyed: { src: 'audio/destroyed.ogg', loop: false, usePanner: false },
          boost: { src: 'audio/boost.ogg', loop: false, usePanner: true },
          wind: { src: 'audio/wind.ogg', loop: true, usePanner: true },
        },
      });
    } else {
      // HIGH
      this.lib.load({
        textures: {
          hex: 'textures.full/hud/hex.jpg',
          spark: 'textures.full/particles/spark.png',
          cloud: 'textures.full/particles/cloud.png',
          'ship.feisar.diffuse': 'textures.full/ships/feisar/diffuse.jpg',
          'ship.feisar.specular': 'textures.full/ships/feisar/specular.jpg',
          'ship.feisar.normal': 'textures.full/ships/feisar/normal.jpg',
          'booster.diffuse': 'textures.full/ships/feisar/booster/booster.png',
          'booster.sprite': 'textures.full/ships/feisar/booster/boostersprite.jpg',
          'track.cityscape.diffuse': 'textures.full/tracks/cityscape/diffuse.jpg',
          'track.cityscape.specular': 'textures.full/tracks/cityscape/specular.jpg',
          'track.cityscape.normal': 'textures.full/tracks/cityscape/normal.jpg',
          'track.cityscape.scrapers1.diffuse': 'textures.full/tracks/cityscape/scrapers1/diffuse.jpg',
          'track.cityscape.scrapers1.specular': 'textures.full/tracks/cityscape/scrapers1/specular.jpg',
          'track.cityscape.scrapers1.normal': 'textures.full/tracks/cityscape/scrapers1/normal.jpg',
          'track.cityscape.scrapers2.diffuse': 'textures.full/tracks/cityscape/scrapers2/diffuse.jpg',
          'track.cityscape.scrapers2.specular': 'textures.full/tracks/cityscape/scrapers2/specular.jpg',
          'track.cityscape.scrapers2.normal': 'textures.full/tracks/cityscape/scrapers2/normal.jpg',
          'track.cityscape.start.diffuse': 'textures.full/tracks/cityscape/start/diffuse.jpg',
          'track.cityscape.start.specular': 'textures.full/tracks/cityscape/start/specular.jpg',
          'track.cityscape.start.normal': 'textures.full/tracks/cityscape/start/normal.jpg',
          'track.cityscape.start.banner': 'textures.full/tracks/cityscape/start/start.jpg',
          'bonus.base.diffuse': 'textures.full/bonus/base/diffuse.jpg',
          'bonus.base.normal': 'textures.full/bonus/base/normal.jpg',
          'bonus.base.specular': 'textures.full/bonus/base/specular.jpg',
        },
        texturesCube: { 'skybox.dawnclouds': 'textures.full/skybox/dawnclouds/%1.jpg' },
        geometries: {
          'bonus.base': 'geometries/bonus/base/base.js',
          booster: 'geometries/booster/booster.js',
          'ship.feisar': 'geometries/ships/feisar/feisar.js',
          'track.cityscape': 'geometries/tracks/cityscape/track.js',
          'track.cityscape.scrapers1': 'geometries/tracks/cityscape/scrapers1.js',
          'track.cityscape.scrapers2': 'geometries/tracks/cityscape/scrapers2.js',
          'track.cityscape.start': 'geometries/tracks/cityscape/start.js',
          'track.cityscape.start.banner': 'geometries/tracks/cityscape/startbanner.js',
          'track.cityscape.bonus.speed': 'geometries/tracks/cityscape/bonus/speed.js',
        },
        analysers: {
          'track.cityscape.collision': 'textures.full/tracks/cityscape/collision.png',
          'track.cityscape.height': 'textures.full/tracks/cityscape/height.png',
        },
        images: {
          'hud.bg': 'textures.full/hud/hud-bg.png',
          'hud.speed': 'textures.full/hud/hud-fg-speed.png',
          'hud.shield': 'textures.full/hud/hud-fg-shield.png',
        },
        sounds: {
          bg: { src: 'audio/bg.ogg', loop: true },
          crash: { src: 'audio/crash.ogg', loop: false },
          destroyed: { src: 'audio/destroyed.ogg', loop: false },
          boost: { src: 'audio/boost.ogg', loop: false },
          wind: { src: 'audio/wind.ogg', loop: true },
        },
      });
    }
  },

  buildMaterials(quality) {
    const lib = this.lib!;
    if (quality < 2) {
      // LOW
      this.materials.track = new THREE.MeshBasicMaterial({ map: lib.get('textures', 'track.cityscape.diffuse') });
      this.materials.bonusBase = new THREE.MeshBasicMaterial({ map: lib.get('textures', 'bonus.base.diffuse') });
      this.materials.bonusSpeed = new THREE.MeshBasicMaterial({ color: 0x0096ff });
      this.materials.ship = new THREE.MeshBasicMaterial({ map: lib.get('textures', 'ship.feisar.diffuse') });
      this.materials.booster = new THREE.MeshBasicMaterial({ map: lib.get('textures', 'booster.diffuse'), transparent: true });
      this.materials.scrapers1 = new THREE.MeshBasicMaterial({ map: lib.get('textures', 'track.cityscape.scrapers1.diffuse') });
      this.materials.scrapers2 = new THREE.MeshBasicMaterial({ map: lib.get('textures', 'track.cityscape.scrapers2.diffuse') });
      this.materials.start = new THREE.MeshBasicMaterial({ map: lib.get('textures', 'track.cityscape.start.diffuse') });
      this.materials.startBanner = new THREE.MeshBasicMaterial({ map: lib.get('textures', 'track.cityscape.start.banner'), transparent: false });
    } else {
      // HIGH
      this.materials.track = createNormalMaterial({
        diffuse: lib.get('textures', 'track.cityscape.diffuse'),
        specular: lib.get('textures', 'track.cityscape.specular'),
        normal: lib.get('textures', 'track.cityscape.normal'),
        metal: true,
      });
      this.materials.bonusBase = createNormalMaterial({
        diffuse: lib.get('textures', 'bonus.base.diffuse'),
        specular: lib.get('textures', 'bonus.base.specular'),
        normal: lib.get('textures', 'bonus.base.normal'),
        normalScale: 3.0,
        metal: false,
      });
      this.materials.bonusSpeed = new THREE.MeshBasicMaterial({ color: 0x0096ff });
      this.materials.ship = createNormalMaterial({
        diffuse: lib.get('textures', 'ship.feisar.diffuse'),
        specular: lib.get('textures', 'ship.feisar.specular'),
        normal: lib.get('textures', 'ship.feisar.normal'),
        metal: true,
      });
      this.materials.booster = new THREE.MeshBasicMaterial({ map: lib.get('textures', 'booster.diffuse'), transparent: true });
      this.materials.scrapers1 = createNormalMaterial({
        diffuse: lib.get('textures', 'track.cityscape.scrapers1.diffuse'),
        specular: lib.get('textures', 'track.cityscape.scrapers1.specular'),
        normal: lib.get('textures', 'track.cityscape.scrapers1.normal'),
        cube: lib.get('texturesCube', 'skybox.dawnclouds'),
        reflectivity: 0.8,
        metal: false,
      });
      this.materials.scrapers2 = createNormalMaterial({
        diffuse: lib.get('textures', 'track.cityscape.scrapers2.diffuse'),
        specular: lib.get('textures', 'track.cityscape.scrapers2.specular'),
        normal: lib.get('textures', 'track.cityscape.scrapers2.normal'),
        cube: lib.get('texturesCube', 'skybox.dawnclouds'),
        reflectivity: 0.8,
        metal: false,
      });
      this.materials.start = createNormalMaterial({
        diffuse: lib.get('textures', 'track.cityscape.start.diffuse'),
        specular: lib.get('textures', 'track.cityscape.start.specular'),
        normal: lib.get('textures', 'track.cityscape.start.normal'),
        metal: false,
      });
      this.materials.startBanner = new THREE.MeshBasicMaterial({ map: lib.get('textures', 'track.cityscape.start.banner'), transparent: false });
    }
  },

  buildScenes(ctx, quality) {
    const lib = this.lib!;

    // IMPORTANT
    this.analyser = lib.get('analysers', 'track.cityscape.collision');

    // SKYBOX
    const sceneCube = new THREE.Scene();
    const cameraCube = new THREE.PerspectiveCamera(70, ctx.width / ctx.height, 1, 6000);
    sceneCube.add(cameraCube);

    const skyUniforms = THREE.UniformsUtils.clone(Shaders.cube.uniforms);
    skyUniforms.tCube.value = lib.get('texturesCube', 'skybox.dawnclouds');

    const skymaterial = new THREE.ShaderMaterial({
      fragmentShader: Shaders.cube.fragmentShader,
      vertexShader: Shaders.cube.vertexShader,
      uniforms: skyUniforms,
      depthWrite: false,
      side: THREE.BackSide,
    });

    const skymesh = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), skymaterial);
    sceneCube.add(skymesh);

    ctx.manager.add('sky', sceneCube, cameraCube);

    const ambient = 0xbbbbbb, diffuse = 0xffffff;

    // MAIN SCENE
    const camera = new THREE.PerspectiveCamera(70, ctx.width / ctx.height, 1, 60000);

    const scene = new THREE.Scene();
    scene.add(camera);
    scene.add(new THREE.AmbientLight(ambient));

    // SUN
    const sun = new THREE.DirectionalLight(diffuse, 1.5);
    sun.position.set(-4000, 1200, 1800);

    if (quality > 2) {
      sun.castShadow = true;
      sun.shadow.camera.near = 50;
      sun.shadow.camera.far = camera.far * 2;
      sun.shadow.camera.right = 3000;
      sun.shadow.camera.left = -3000;
      sun.shadow.camera.top = 3000;
      sun.shadow.camera.bottom = -3000;
      sun.shadow.bias = 0.0001;
      sun.shadow.mapSize.set(2048, 2048);
    }
    scene.add(sun);

    // SHIP
    const ship = ctx.createMesh(scene, lib.get('geometries', 'ship.feisar'), -1134 * 2, 10, -443 * 2, this.materials.ship);

    const booster = ctx.createMesh(ship, lib.get('geometries', 'booster'), 0, 0.665, -3.8, this.materials.booster);
    (booster.material as THREE.Material).depthWrite = false;

    const boosterSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: lib.get('textures', 'booster.sprite'),
        blending: THREE.AdditiveBlending,
        color: 0xffffff,
      })
    );
    boosterSprite.scale.set(0.02, 0.02, 0.02);
    booster.add(boosterSprite);

    const boosterLight = new THREE.PointLight(0x00a2ff, 4.0, 60);
    boosterLight.position.set(0, 0.665, -4);

    if (quality > 0) ship.add(boosterLight);

    // SHIP CONTROLS
    const shipControls = new ShipControls(ctx);
    shipControls.collisionMap = lib.get('analysers', 'track.cityscape.collision');
    shipControls.collisionPixelRatio = 2048.0 / 6000.0;
    shipControls.collisionDetection = true;
    shipControls.heightMap = lib.get('analysers', 'track.cityscape.height');
    shipControls.heightPixelRatio = 2048.0 / 6000.0;
    shipControls.heightBias = 4.0;
    shipControls.heightScale = 10.0;
    shipControls.control(ship);
    ctx.components.shipControls = shipControls;
    ctx.tweakShipControls();

    // SHIP EFFECTS AND PARTICLES
    const fxParams: any = {
      scene,
      shipControls,
      booster,
      boosterSprite,
      boosterLight,
      useParticles: false,
    };

    if (quality > 2) {
      fxParams.textureCloud = lib.get('textures', 'cloud');
      fxParams.textureSpark = lib.get('textures', 'spark');
      fxParams.useParticles = true;
    }
    ctx.components.shipEffects = new ShipEffects(fxParams);

    // TRACK
    ctx.createMesh(scene, lib.get('geometries', 'track.cityscape'), 0, -5, 0, this.materials.track);
    ctx.createMesh(scene, lib.get('geometries', 'bonus.base'), 0, -5, 0, this.materials.bonusBase);
    const bonusSpeed = ctx.createMesh(scene, lib.get('geometries', 'track.cityscape.bonus.speed'), 0, -5, 0, this.materials.bonusSpeed);
    bonusSpeed.receiveShadow = false;
    ctx.createMesh(scene, lib.get('geometries', 'track.cityscape.scrapers1'), 0, 0, 0, this.materials.scrapers1);
    ctx.createMesh(scene, lib.get('geometries', 'track.cityscape.scrapers2'), 0, 0, 0, this.materials.scrapers2);
    ctx.createMesh(scene, lib.get('geometries', 'track.cityscape.start'), 0, -5, 0, this.materials.start);
    const startbanner = ctx.createMesh(scene, lib.get('geometries', 'track.cityscape.start.banner'), 0, -5, 0, this.materials.startBanner);
    (startbanner.material as THREE.Material).side = THREE.DoubleSide;

    // CAMERA
    ctx.components.cameraChase = new CameraChase({
      target: ship,
      camera,
      cameraCube: ctx.manager.get('sky').camera,
      lerp: 0.5,
      yoffest: 8.0,
      zoffset: 10.0,
      viewOffset: 10.0,
    });

    ctx.manager.add(
      'game',
      scene,
      camera,
      function (this: any, delta: number) {
        if (delta > 25 && this.objects.lowFPS < 1000) this.objects.lowFPS++;

        const dt = delta / 16.6;

        this.objects.components.shipControls.update(dt);
        this.objects.components.shipEffects.update(dt);
        this.objects.components.cameraChase.update(dt, this.objects.components.shipControls.getSpeedRatio());

        this.objects.composers.game.render(dt);

        if (this.objects.hud)
          this.objects.hud.update(
            this.objects.components.shipControls.getRealSpeed(100),
            this.objects.components.shipControls.getRealSpeedRatio(),
            this.objects.components.shipControls.getShield(100),
            this.objects.components.shipControls.getShieldRatio()
          );

        if (this.objects.components.shipControls.getShieldRatio() < 0.2)
          this.objects.extras.vignetteColor.setHex(0x992020);
        else this.objects.extras.vignetteColor.setHex(0x458ab1);
      },
      {
        components: ctx.components,
        composers: ctx.composers,
        extras: ctx.extras,
        quality,
        hud: ctx.hud,
        time: 0.0,
        lowFPS: 0,
      }
    );
  },
};
