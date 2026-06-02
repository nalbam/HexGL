/*
 * HexGL — Canvas 2D HUD (speed/shield bars, time, laps, messages).
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 * @license CC BY-NC 3.0
 */
import type { TimeParts } from '../core/Timer';

export interface HUDOptions {
  width: number;
  height: number;
  font?: string;
  bg: HTMLImageElement;
  speed: HTMLImageElement;
  shield: HTMLImageElement;
}

export class HUD {
  visible = true;
  messageOnly = false;

  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  bg: HTMLImageElement;
  fgspeed: HTMLImageElement;
  fgshield: HTMLImageElement;

  speedFontRatio = 24;
  speedBarRatio = 2.91;
  shieldFontRatio = 64;
  shieldBarYRatio = 34;
  shieldBarWRatio = 18.3;
  shieldBarHRatio = 14.3;
  timeMarginRatio = 18;
  timeFontRatio = 19.2;

  font: string;
  time = '';

  message = '';
  previousMessage = '';
  messageTiming = 0;
  messagePos = 0.0;
  messagePosTarget = 0.0;
  messagePosTargetRatio = 12;
  messageA = 1.0;
  messageAS = 1.0;
  messageDuration = 2 * 60;
  messageDurationD = 2 * 60;
  messageDurationS = 30;
  messageYRatio = 34;
  messageFontRatio = 10;
  messageFontRatioStart = 6;
  messageFontRatioEnd = 10;
  messageFontLerp = 0.4;
  messageLerp = 0.4;
  messageFontAlpha = 0.8;

  lapMarginRatio = 14;
  lap = '';
  lapSeparator = '/';

  timeSeparators = ['', "'", "''", ''];

  step = 0;
  maxStep = 2;

  constructor(opts: HUDOptions) {
    this.width = opts.width;
    this.height = opts.height;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.textAlign = 'center';

    this.bg = opts.bg;
    this.fgspeed = opts.speed;
    this.fgshield = opts.shield;
    this.font = opts.font || 'Arial';
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  display(msg: string, duration?: number): void {
    this.messageTiming = 0;

    if (this.message != '') {
      this.messageA = this.messageFontAlpha;
      this.messagePos = 0.0;
      this.messagePosTarget = this.width / this.messagePosTargetRatio;
      this.previousMessage = this.message;
    }

    this.messageFontRatio = this.messageFontRatioStart;
    this.messageAS = 0.0;
    this.message = msg;
    this.messageDuration = duration == undefined ? this.messageDurationD : duration * 60;
  }

  updateLap(current: number | string, total: number | string): void {
    this.lap = current + this.lapSeparator + total;
  }

  resetLap(): void {
    this.lap = '';
  }

  updateTime(time: TimeParts | { m: string; s: string; ms: string }): void {
    this.time =
      this.timeSeparators[0] + time.m + this.timeSeparators[1] + time.s + this.timeSeparators[2] + time.ms + this.timeSeparators[3];
  }

  resetTime(): void {
    this.time = '';
  }

  update(speed: number | string, speedRatio: number, shield: number | string, shieldRatio: number): void {
    const SCREEN_WIDTH = this.width;
    const SCREEN_HEIGHT = this.height;
    const SCREEN_HW = SCREEN_WIDTH / 2;
    const SCREEN_HH = SCREEN_HEIGHT / 2;

    if (!this.visible) {
      this.ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      return;
    }

    const w = this.bg.width;
    const h = this.bg.height;
    const r = h / w;
    const nw = SCREEN_WIDTH;
    const nh = nw * r;
    const oh = SCREEN_HEIGHT - nh;
    const o = 0;
    // speedbar
    const ba = nh;
    const bl = SCREEN_WIDTH / this.speedBarRatio;
    const bw = bl * speedRatio;
    // shieldbar
    const sw = SCREEN_WIDTH / this.shieldBarWRatio;
    const sho = SCREEN_WIDTH / this.shieldBarHRatio;
    const sh = sho * shieldRatio;
    const sy = SCREEN_WIDTH / this.shieldBarYRatio + sho - sh;

    if (this.step == 0) {
      this.ctx.clearRect(0, oh, SCREEN_WIDTH, nh);

      if (!this.messageOnly) {
        this.ctx.drawImage(this.bg, o, oh, nw, nh);

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(bw + ba + SCREEN_HW, oh);
        this.ctx.lineTo(-(bw + ba) + SCREEN_HW, oh);
        this.ctx.lineTo(-bw + SCREEN_HW, SCREEN_HEIGHT);
        this.ctx.lineTo(bw + SCREEN_HW, SCREEN_HEIGHT);
        this.ctx.lineTo(bw + ba + SCREEN_HW, oh);
        this.ctx.clip();
        this.ctx.drawImage(this.fgspeed, o, oh, nw, nh);
        this.ctx.restore();

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(-sw + SCREEN_HW, oh + sy);
        this.ctx.lineTo(sw + SCREEN_HW, oh + sy);
        this.ctx.lineTo(sw + SCREEN_HW, oh + sh + sy);
        this.ctx.lineTo(-sw + SCREEN_HW, oh + sh + sy);
        this.ctx.lineTo(-sw + SCREEN_HW, oh + sh);
        this.ctx.clip();
        this.ctx.drawImage(this.fgshield, o, oh, nw, nh);
        this.ctx.restore();

        // SPEED
        this.ctx.font = SCREEN_WIDTH / this.speedFontRatio + 'px ' + this.font;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillText(String(speed), SCREEN_HW, SCREEN_HEIGHT - nh * 0.57);

        // SHIELD
        this.ctx.font = SCREEN_WIDTH / this.shieldFontRatio + 'px ' + this.font;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.fillText(String(shield), SCREEN_HW, SCREEN_HEIGHT - nh * 0.44);
      }
    } else if (this.step == 1) {
      this.ctx.clearRect(0, 0, SCREEN_WIDTH, oh);

      // TIME
      if (this.time != '') {
        this.ctx.font = SCREEN_WIDTH / this.timeFontRatio + 'px ' + this.font;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillText(this.time, SCREEN_HW, SCREEN_WIDTH / this.timeMarginRatio);
      }

      // LAPS
      if (this.lap != '') {
        this.ctx.font = SCREEN_WIDTH / this.timeFontRatio + 'px ' + this.font;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillText(this.lap, SCREEN_WIDTH - SCREEN_WIDTH / this.lapMarginRatio, SCREEN_WIDTH / this.timeMarginRatio);
      }

      // MESSAGE
      const my = SCREEN_HH - SCREEN_WIDTH / this.messageYRatio;

      if (this.messageTiming > this.messageDuration + 2000) {
        this.previousMessage = '';
        this.message = '';
        this.messageA = 0.0;
      } else if (this.messageTiming > this.messageDuration && this.message != '') {
        this.previousMessage = this.message;
        this.message = '';
        this.messagePos = 0.0;
        this.messagePosTarget = SCREEN_WIDTH / this.messagePosTargetRatio;
        this.messageA = this.messageFontAlpha;
      }

      if (this.previousMessage != '') {
        if (this.messageA < 0.001) this.messageA = 0.0;
        else this.messageA += (0.0 - this.messageA) * this.messageLerp;

        this.messagePos += (this.messagePosTarget - this.messagePos) * this.messageLerp;

        this.ctx.font = SCREEN_WIDTH / this.messageFontRatioEnd + 'px ' + this.font;
        this.ctx.fillStyle = 'rgba(255, 255, 255, ' + this.messageA + ')';
        this.ctx.fillText(this.previousMessage, SCREEN_HW, my + this.messagePos);
      }

      if (this.message != '') {
        if (this.messageTiming < this.messageDurationS) {
          this.messageAS += (this.messageFontAlpha - this.messageAS) * this.messageFontLerp;
          this.messageFontRatio += (this.messageFontRatioEnd - this.messageFontRatio) * this.messageFontLerp;
        } else {
          this.messageAS = this.messageFontAlpha;
          this.messageFontRatio = this.messageFontRatioEnd;
        }

        this.ctx.font = SCREEN_WIDTH / this.messageFontRatio + 'px ' + this.font;
        this.ctx.fillStyle = 'rgba(255, 255, 255, ' + this.messageAS + ')';
        this.ctx.fillText(this.message, SCREEN_HW, my);
      }
    }

    this.messageTiming++;

    this.step++;
    if (this.step == this.maxStep) this.step = 0;
  }
}
