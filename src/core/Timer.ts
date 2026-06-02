/*
 * Date-based timer used as the game clock.
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 */

export interface TimeState {
  start: number;
  current: number;
  previous: number;
  elapsed: number;
  delta: number;
}

export interface TimeParts {
  h: number;
  m: number;
  s: number;
  ms: number;
}

export interface TimePartsString {
  h: string;
  m: string;
  s: string;
  ms: string;
}

export class Timer {
  time: TimeState;
  active: boolean;

  constructor() {
    this.time = { start: 0, current: 0, previous: 0, elapsed: 0, delta: 0 };
    this.active = false;
  }

  /** Starts/restarts the timer. */
  start(): void {
    const now = Date.now();
    this.time.start = now;
    this.time.current = now;
    this.time.previous = now;
    this.time.elapsed = 0;
    this.time.delta = 0;
    this.active = true;
  }

  /** Pauses(true)/Unpauses(false) the timer. */
  pause(doPause: boolean): void {
    this.active = !doPause;
  }

  /** Update method to be called inside a RAF loop. */
  update(): void {
    if (!this.active) return;
    const now = Date.now();
    this.time.current = now;
    this.time.elapsed = this.time.current - this.time.start;
    this.time.delta = now - this.time.previous;
    this.time.previous = now;
  }

  getElapsedTime(): TimePartsString {
    return Timer.msToTimeString(this.time.elapsed);
  }

  /** Formats a millisecond integer into a {h,m,s,ms} object. */
  static msToTime(t: number): TimeParts {
    return {
      h: Math.floor(t / 3600000),
      m: Math.floor((t / 60000) % 60),
      s: Math.floor((t / 1000) % 60),
      ms: t % 1000,
    };
  }

  /** Formats a millisecond integer into a {h,m,s,ms} object with leading zeros. */
  static msToTimeString(t: number): TimePartsString {
    const time = Timer.msToTime(t);
    return {
      h: Timer.zfill(time.h, 2),
      m: Timer.zfill(time.m, 2),
      s: Timer.zfill(time.s, 2),
      ms: Timer.zfill(time.ms, 4),
    };
  }

  /** Converts an integer to a string padded with leading zeros. */
  static zfill(num: number, size: number): string {
    const len = size - num.toString().length;
    return len > 0 ? new Array(len + 1).join('0') + num : num.toString();
  }
}
