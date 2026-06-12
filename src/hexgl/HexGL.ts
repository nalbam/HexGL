/*
 * HexGL — top-level orchestrator (renderer, composers, HUD, gameplay).
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 * @license CC BY-NC 3.0
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BloomPass } from 'three/addons/postprocessing/BloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { RenderManager } from '../threejs/RenderManager';
import { Shaders } from '../threejs/Shaders';
import { Audio } from '../core/Audio';
import { Timer } from '../core/Timer';
import { HUD } from './HUD';
import { Gameplay } from './Gameplay';
import { Ladder } from './Ladder';
import { Cityscape } from './tracks/Cityscape';

const tracks: Record<string, any> = { Cityscape };

export interface HexGLOptions {
  document?: Document;
  width?: number;
  height?: number;
  container?: HTMLElement;
  overlay?: HTMLElement;
  gameover?: HTMLElement | null;
  quality?: number;
  difficulty?: number;
  hud?: boolean;
  controlType?: number;
  godmode?: boolean;
  track?: string;
  mode?: string;
  player?: string;
}

export class HexGL {
  document: Document;
  active = true;
  displayHUD: boolean;
  width: number;
  height: number;
  difficulty: number;
  player: string;
  track: any;
  mode: string;
  controlType: number;
  quality: number;

  settings: any = null;
  renderer!: THREE.WebGLRenderer;
  manager!: RenderManager;
  canvas!: HTMLCanvasElement;
  materials: Record<string, THREE.Material> = {};
  components: Record<string, any> = {};
  extras: { vignetteColor: THREE.Color; bloom: any; fxaa: any } = {
    vignetteColor: new THREE.Color(0x458ab1),
    bloom: null,
    fxaa: null,
  };

  containers: { main: HTMLElement; overlay: HTMLElement };
  gameover: HTMLElement | null;
  godmode: boolean;
  hud: HUD | null = null;
  gameplay: Gameplay | null = null;
  composers: { game: EffectComposer | null } = { game: null };

  constructor(opts: HexGLOptions) {
    const self = this;

    this.document = opts.document || document;
    this.displayHUD = opts.hud == undefined ? true : opts.hud;
    this.width = opts.width == undefined ? window.innerWidth : opts.width;
    this.height = opts.height == undefined ? window.innerHeight : opts.height;
    this.difficulty = opts.difficulty == undefined ? 0 : opts.difficulty;
    this.player = opts.player == undefined ? 'Anonym' : opts.player;
    this.track = tracks[opts.track == undefined ? 'Cityscape' : opts.track];
    this.mode = opts.mode == undefined ? 'timeattack' : opts.mode;
    this.controlType = opts.controlType == undefined ? 1 : opts.controlType;

    // 0 == low, 1 == mid, 2 == high, 3 == very high
    this.quality = opts.quality == undefined ? 3 : opts.quality;
    if (this.quality === 0) {
      this.width /= 2;
      this.height /= 2;
    }

    this.containers = {
      main: opts.container == undefined ? document.body : opts.container,
      overlay: opts.overlay == undefined ? document.body : opts.overlay,
    };
    this.gameover = opts.gameover == undefined ? null : opts.gameover;
    this.godmode = opts.godmode == undefined ? false : opts.godmode;

    this.initRenderer();

    this.document.addEventListener(
      'keydown',
      (event: KeyboardEvent) => {
        if (event.keyCode == 27 /* escape */) self.reset();
      },
      false
    );
  }

  start(): void {
    this.manager.setCurrent('game');
    const self = this;
    const raf = () => {
      if (self && self.active) requestAnimationFrame(raf);
      self.update();
    };
    raf();
    this.initGameplay();
  }

  reset(): void {
    this.manager.get('game').objects.lowFPS = 0;
    this.gameplay!.start();

    Audio.stop('bg');
    Audio.stop('wind');
    Audio.volume('wind', 0.35);
    Audio.play('bg');
    Audio.play('wind');
  }

  restart(): void {
    try {
      const finish = this.document.getElementById('finish');
      if (finish) finish.style.display = 'none';
    } catch (e) {
      /* noop */
    }
    this.reset();
  }

  update(): void {
    if (!this.active) return;
    if (this.gameplay != null) this.gameplay.update();
    this.manager.renderCurrent();
  }

  init(): void {
    this.initHUD();
    this.track.buildMaterials(this.quality);
    this.track.buildScenes(this, this.quality);
    this.initGameComposer();
  }

  load(opts: any): void {
    this.track.load(opts, this.quality);
  }

  initGameplay(): void {
    const self = this;
    this.gameplay = new Gameplay({
      mode: this.mode,
      hud: this.hud,
      shipControls: this.components.shipControls,
      cameraControls: this.components.cameraChase,
      analyser: this.track.analyser,
      pixelRatio: this.track.pixelRatio,
      track: this.track,
      onFinish: function (this: Gameplay) {
        self.components.shipControls.terminate();
        self.displayScore(this.finishTime as number, this.lapTimes);
      },
    });

    this.gameplay.start();

    Audio.play('bg');
    Audio.play('wind');
    Audio.volume('wind', 0.35);
  }

  displayScore(f: number, l: number[]): void {
    this.active = false;

    const tf = Timer.msToTimeString(f);
    const tl = [Timer.msToTimeString(l[0]), Timer.msToTimeString(l[1]), Timer.msToTimeString(l[2])];

    if (this.gameover !== null) {
      this.gameover.style.display = 'block';
      (this.gameover.children[0] as HTMLElement).innerHTML = tf.m + "'" + tf.s + "''" + tf.ms;
      this.containers.main.parentElement!.style.display = 'none';
      return;
    }

    const t = this.track;
    const dc = this.document.getElementById('finish')!;
    const ds = this.document.getElementById('finish-state');
    const dh = this.document.getElementById('finish-hallmsg');
    const dr = this.document.getElementById('finish-msg');
    const dt = this.document.getElementById('finish-result');
    const dl1 = this.document.getElementById('finish-lap1');
    const dl2 = this.document.getElementById('finish-lap2');
    const dl3 = this.document.getElementById('finish-lap3');
    const dd = this.document.getElementById('finish-diff');
    const st = this.document.getElementById('finish-twitter') as HTMLAnchorElement | null;
    const sf = this.document.getElementById('finish-fb') as HTMLAnchorElement | null;
    const sl = this.document.getElementById('lowfps-msg');
    const d = this.difficulty == 0 ? 'casual' : 'hard';
    const ts = this.hud!.timeSeparators;

    if (this.gameplay!.result == this.gameplay!.results.FINISH) {
      if (ds != undefined) ds.innerHTML = 'Finished!';
      if (typeof Storage !== 'undefined') {
        if (localStorage['score-' + t + '-' + d] == undefined || localStorage['score-' + t + '-' + d] > f) {
          if (dr != undefined) dr.innerHTML = 'New local record!';
          localStorage['score-' + t + '-' + d] = f;
          localStorage['race-' + t + '-replay'] = JSON.stringify(this.gameplay!.raceData.export());
        } else {
          if (dr != undefined) dr.innerHTML = 'Well done!';
        }
      }
      const p = Ladder.global[t]?.[d]?.[Ladder.global[t]?.[d]?.length - 2];
      if (p != undefined && p['score'] > f) {
        if (dh != undefined) dh.innerHTML = 'You made it to the HOF!';
      } else {
        if (dh != undefined) dh.innerHTML = 'Hall Of Fame';
      }

      if (dt != undefined) dt.innerHTML = tf.m + ts[1] + tf.s + ts[2] + tf.ms;
      if (dl1 != undefined) dl1.innerHTML = (tl[0] as any)['m'] != undefined ? tl[0].m + ts[1] + tl[0].s + ts[2] + tl[0].ms : '-';
      if (dl2 != undefined) dl2.innerHTML = (tl[1] as any)['m'] != undefined ? tl[1].m + ts[1] + tl[1].s + ts[2] + tl[1].ms : '-';
      if (dl3 != undefined) dl3.innerHTML = (tl[2] as any)['m'] != undefined ? tl[2].m + ts[1] + tl[2].s + ts[2] + tl[2].ms : '-';
    } else {
      if (ds != undefined) ds.innerHTML = 'Destroyed!';
      if (dr != undefined) dr.innerHTML = 'Maybe next time!';
      if (dh != undefined) dh.innerHTML = 'Hall Of Fame';
      if (dt != undefined) dt.innerHTML = 'None';
      if (dl1 != undefined) dl1.innerHTML = 'None';
      if (dl2 != undefined) dl2.innerHTML = 'None';
      if (dl3 != undefined) dl3.innerHTML = 'None';
    }

    if (dd != undefined) dd.innerHTML = d;
    if (st != undefined && dt != undefined)
      st.href = 'http://twitter.com/share?text=' + encodeURIComponent('I just scored ' + dt.innerHTML + ' in Cityscape (' + d + ') on #HexGL! Come try it and beat my record on ');
    if (sf != undefined)
      sf.href =
        'http://www.facebook.com/sharer.php?s=100' +
        '&p[title]=' + encodeURIComponent('I just scored ' + (dt ? dt.innerHTML : '') + ' in Cityscape (' + d + ') on HexGL!') +
        '&p[summary]=' + encodeURIComponent('HexGL is a futuristic racing game built by Thibaut Despoulain (BKcore) using HTML5, Javascript and WebGL. Come challenge your friends on this fast-paced 3D game!') +
        '&p[url]=' + encodeURIComponent('http://hexgl.bkcore.com') +
        '&p[images][0]=' + encodeURIComponent('http://hexgl.bkcore.com/image.png');

    Ladder.displayLadder('finish-ladder', t, d, 8);

    if (this.manager.get('game').objects.lowFPS >= 999) {
      if (sl != undefined) sl.innerHTML = 'Note: Your framerate was pretty low, you should try a lesser graphic setting!';
    } else {
      if (sl != undefined) sl.innerHTML = '';
    }

    dc.style.display = 'block';
  }

  initRenderer(): void {
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setClearColor(0x000000, 1);

    if (this.quality > 2) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.autoClear = false;
    renderer.sortObjects = false;
    // updateStyle=false: the page's `canvas { width: 100% }` rule scales the
    // (possibly half-resolution, quality 0) buffer to the full viewport.
    renderer.setSize(this.width, this.height, false);
    renderer.domElement.style.position = 'relative';

    this.containers.main.appendChild(renderer.domElement);
    this.canvas = renderer.domElement;
    this.renderer = renderer;
    this.manager = new RenderManager(renderer);
  }

  initHUD(): void {
    if (!this.displayHUD) return;
    this.hud = new HUD({
      width: this.width,
      height: this.height,
      font: 'BebasNeueRegular',
      bg: this.track.lib.get('images', 'hud.bg'),
      speed: this.track.lib.get('images', 'hud.speed'),
      shield: this.track.lib.get('images', 'hud.shield'),
    });
    this.containers.overlay.appendChild(this.hud.canvas);
  }

  initGameComposer(): void {
    const renderSky = new RenderPass(this.manager.get('sky').scene, this.manager.get('sky').camera);
    const renderModel = new RenderPass(this.manager.get('game').scene, this.manager.get('game').camera);
    renderModel.clear = false;

    this.composers.game = new EffectComposer(this.renderer);

    this.composers.game.addPass(renderSky);
    this.composers.game.addPass(renderModel);

    if (this.quality > 2) {
      const effectBloom = new BloomPass(0.8, 25, 4);
      this.composers.game.addPass(effectBloom);
      this.extras.bloom = effectBloom;
    }

    if (this.quality > 0) {
      const effectHex = new ShaderPass(Shaders.hexvignette as any);
      effectHex.uniforms['size'].value = 512.0 * (this.width / 1633);
      effectHex.uniforms['rx'].value = this.width;
      effectHex.uniforms['ry'].value = this.height;
      effectHex.uniforms['tHex'].value = this.track.lib.get('textures', 'hex');
      effectHex.uniforms['color'].value = this.extras.vignetteColor;
      this.composers.game.addPass(effectHex);
    }

    // Converts the linear render-target chain to sRGB on the final screen output.
    this.composers.game.addPass(new OutputPass());
  }

  createMesh(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);

    if (this.quality > 2) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }

    return mesh;
  }

  tweakShipControls(): void {
    const c = this.components.shipControls;
    if (this.difficulty == 1) {
      c.airResist = 0.035;
      c.airDrift = 0.07;
      c.thrust = 0.035;
      c.airBrake = 0.04;
      c.maxSpeed = 9.6;
      c.boosterSpeed = c.maxSpeed * 0.35;
      c.boosterDecay = 0.007;
      c.angularSpeed = 0.014;
      c.airAngularSpeed = 0.0165;
      c.rollAngle = 0.6;
      c.shieldDamage = 0.03;
      c.collisionSpeedDecrease = 0.8;
      c.collisionSpeedDecreaseCoef = 0.5;
      c.rollLerp = 0.1;
      c.driftLerp = 0.4;
      c.angularLerp = 0.4;
    } else if (this.difficulty == 0) {
      c.airResist = 0.02;
      c.airDrift = 0.06;
      c.thrust = 0.02;
      c.airBrake = 0.025;
      c.maxSpeed = 7.0;
      c.boosterSpeed = c.maxSpeed * 0.5;
      c.boosterDecay = 0.007;
      c.angularSpeed = 0.0125;
      c.airAngularSpeed = 0.0135;
      c.rollAngle = 0.6;
      c.shieldDamage = 0.06;
      c.collisionSpeedDecrease = 0.8;
      c.collisionSpeedDecreaseCoef = 0.5;
      c.rollLerp = 0.07;
      c.driftLerp = 0.3;
      c.angularLerp = 0.4;
    }

    if (this.godmode) c.shieldDamage = 0.0;
  }
}
