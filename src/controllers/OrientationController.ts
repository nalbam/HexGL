/*
 * OrientationController (device orientation + buttons) for touch devices.
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 */

export type OrientationTouchCallback = (pressed: boolean, touch: Touch, event: TouchEvent) => void;

export class OrientationController {
  static isCompatible(): boolean {
    return 'DeviceOrientationEvent' in window;
  }

  dom: HTMLElement | Document;
  registerTouch: boolean;
  touchCallback: OrientationTouchCallback | null;
  active: boolean;
  alpha: number;
  beta: number;
  gamma: number;
  dalpha: number | null;
  dbeta: number | null;
  dgamma: number | null;
  touches: TouchList | null;

  constructor(dom: HTMLElement | Document, registerTouch?: boolean, touchCallback?: OrientationTouchCallback) {
    this.dom = dom;
    this.registerTouch = registerTouch != null ? registerTouch : true;
    this.touchCallback = touchCallback != null ? touchCallback : null;
    this.active = true;
    this.alpha = 0.0;
    this.beta = 0.0;
    this.gamma = 0.0;
    this.dalpha = null;
    this.dbeta = null;
    this.dgamma = null;
    this.touches = null;
    window.addEventListener('deviceorientation', (e) => this.orientationChange(e as DeviceOrientationEvent), false);
    if (this.registerTouch) {
      this.dom.addEventListener('touchstart', (e) => this.touchStart(e as TouchEvent), false);
      this.dom.addEventListener('touchend', (e) => this.touchEnd(e as TouchEvent), false);
    }
  }

  private orientationChange(event: DeviceOrientationEvent): boolean {
    if (!this.active) return false;
    if (this.dalpha === null) {
      this.dalpha = event.alpha ?? 0;
      this.dbeta = event.beta ?? 0;
      this.dgamma = event.gamma ?? 0;
    }
    this.alpha = (event.alpha ?? 0) - this.dalpha;
    this.beta = (event.beta ?? 0) - this.dbeta!;
    this.gamma = (event.gamma ?? 0) - this.dgamma!;
    return false;
  }

  private touchStart(event: TouchEvent): boolean {
    if (!this.active) return false;
    for (const touch of Array.from(event.changedTouches)) {
      if (typeof this.touchCallback === 'function') this.touchCallback(true, touch, event);
    }
    this.touches = event.touches;
    return false;
  }

  private touchEnd(event: TouchEvent): boolean {
    if (!this.active) return false;
    for (const touch of Array.from(event.changedTouches)) {
      if (typeof this.touchCallback === 'function') this.touchCallback(false, touch, event);
    }
    this.touches = event.touches;
    return false;
  }
}
