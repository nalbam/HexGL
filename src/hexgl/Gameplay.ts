/*
 * HexGL — race state machine (timeattack / survival / replay).
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 * @license CC BY-NC 3.0
 */
import { Timer } from '../core/Timer';
import { RaceData } from './RaceData';
import type { ShipControls } from './ShipControls';
import type { CameraChase } from './CameraChase';
import type { HUD } from './HUD';
import type { ImageDataLoader } from '../core/ImageData';

export interface GameplayOptions {
  mode?: string;
  hud: HUD | null;
  shipControls: ShipControls;
  cameraControls: CameraChase;
  analyser: ImageDataLoader;
  pixelRatio: number;
  track: any;
  onFinish?: (this: Gameplay) => void;
}

export class Gameplay {
  startDelay: number;
  countDownDelay: number;

  active = false;
  timer = new Timer();
  modes: Record<string, (this: Gameplay) => void> = { timeattack: null as any, survival: null as any, replay: null as any };
  mode: string;
  step = 0;

  hud: HUD | null;
  shipControls: ShipControls;
  cameraControls: CameraChase;
  track: any;
  analyser: ImageDataLoader;
  pixelRatio: number;

  previousCheckPoint = -1;

  results = { FINISH: 1, DESTROYED: 2, WRONGWAY: 3, REPLAY: 4, NONE: -1 };
  result: number;

  lap = 1;
  lapTimes: number[] = [];
  lapTimeElapsed = 0;
  maxLaps = 3;
  score: any = null;
  finishTime: number | null = null;
  onFinish: (this: Gameplay) => void;

  raceData: RaceData = null as any;

  constructor(opts: GameplayOptions) {
    const self = this;

    this.startDelay = opts.hud == null ? 0 : 1000;
    this.countDownDelay = opts.hud == null ? 1000 : 1500;

    this.mode = opts.mode == undefined || !(opts.mode in this.modes) ? 'timeattack' : opts.mode;

    this.hud = opts.hud;
    this.shipControls = opts.shipControls;
    this.cameraControls = opts.cameraControls;
    this.track = opts.track;
    this.analyser = opts.analyser;
    this.pixelRatio = opts.pixelRatio;

    this.result = this.results.NONE;
    this.onFinish = opts.onFinish == undefined ? function () { console.log('FINISH'); } : opts.onFinish;

    this.modes.timeattack = function (this: Gameplay) {
      self.raceData.tick(this.timer.time.elapsed);

      if (self.hud != null) self.hud.updateTime(self.timer.getElapsedTime());
      const cp = self.checkPoint();

      if (cp == self.track.checkpoints.start && self.previousCheckPoint == self.track.checkpoints.last) {
        self.previousCheckPoint = cp;
        const t = self.timer.time.elapsed;
        self.lapTimes.push(t - self.lapTimeElapsed);
        self.lapTimeElapsed = t;

        if (self.lap == this.maxLaps) {
          self.end(self.results.FINISH);
        } else {
          self.lap++;
          if (self.hud != null) self.hud.updateLap(self.lap, self.maxLaps);
          if (self.lap == self.maxLaps && self.hud != null) self.hud.display('Final lap', 0.5);
        }
      } else if (cp != -1 && cp != self.previousCheckPoint) {
        self.previousCheckPoint = cp;
      }

      if (self.shipControls.destroyed == true) {
        self.end(self.results.DESTROYED);
      }
    };

    this.modes.replay = function (this: Gameplay) {
      self.raceData.applyInterpolated(this.timer.time.elapsed);
      if (self.raceData.seek == self.raceData.last) {
        self.end(self.results.REPLAY);
      }
    };
  }

  simu(): void {
    this.lapTimes = [92300, 91250, 90365];
    this.finishTime = this.lapTimes[0] + this.lapTimes[1] + this.lapTimes[2];
    if (this.hud != null) this.hud.display('Finish');
    this.step = 100;
    this.result = this.results.FINISH;
    this.shipControls.active = false;
  }

  start(_opts?: any): boolean | void {
    this.finishTime = null;
    this.score = null;
    this.lap = 1;

    this.shipControls.reset(this.track.spawn, this.track.spawnRotation);
    this.shipControls.active = false;

    this.previousCheckPoint = this.track.checkpoints.start;

    this.raceData = new RaceData(this.track.name, this.mode, this.shipControls);
    if (this.mode == 'replay') {
      this.cameraControls.mode = this.cameraControls.modes.ORBIT;
      if (this.hud != null) this.hud.messageOnly = true;

      try {
        const d = localStorage['race-' + this.track.name + '-replay'];
        if (d == undefined) {
          console.error('No replay data for ' + 'race-' + this.track.name + '-replay' + '.');
          return false;
        }
        this.raceData.import(JSON.parse(d));
      } catch (e) {
        console.error('Bad replay format : ' + e);
        return false;
      }
    }

    this.active = true;
    this.step = 0;
    this.timer.start();
    if (this.hud != null) {
      this.hud.resetTime();
      this.hud.display('Get ready', 1);
      this.hud.updateLap(this.lap, this.maxLaps);
    }
  }

  end(result: number): void {
    this.score = this.timer.getElapsedTime();
    this.finishTime = this.timer.time.elapsed;
    this.timer.start();
    this.result = result;

    this.shipControls.active = false;

    if (result == this.results.FINISH) {
      if (this.hud != null) this.hud.display('Finish');
      this.step = 100;
    } else if (result == this.results.DESTROYED) {
      if (this.hud != null) this.hud.display('Destroyed');
      this.step = 100;
    }
  }

  update(): void {
    if (!this.active) return;

    this.timer.update();

    if (this.step == 0 && this.timer.time.elapsed >= this.countDownDelay + this.startDelay) {
      if (this.hud != null) this.hud.display('3');
      this.step = 1;
    } else if (this.step == 1 && this.timer.time.elapsed >= 2 * this.countDownDelay + this.startDelay) {
      if (this.hud != null) this.hud.display('2');
      this.step = 2;
    } else if (this.step == 2 && this.timer.time.elapsed >= 3 * this.countDownDelay + this.startDelay) {
      if (this.hud != null) this.hud.display('1');
      this.step = 3;
    } else if (this.step == 3 && this.timer.time.elapsed >= 4 * this.countDownDelay + this.startDelay) {
      if (this.hud != null) this.hud.display('Go', 0.5);
      this.step = 4;
      this.timer.start();
      if (this.mode != 'replay') this.shipControls.active = true;
    } else if (this.step == 4) {
      this.modes[this.mode].call(this);
    } else if (this.step == 100 && this.timer.time.elapsed >= 2000) {
      this.active = false;
      this.onFinish.call(this);
    }
  }

  checkPoint(): number {
    const x = Math.round(this.analyser.pixels!.width / 2 + this.shipControls.dummy.position.x * this.pixelRatio);
    const z = Math.round(this.analyser.pixels!.height / 2 + this.shipControls.dummy.position.z * this.pixelRatio);

    const color = this.analyser.getPixel(x, z);

    if (color.r == 255 && color.g == 255 && color.b < 250) return color.b;
    else return -1;
  }
}
