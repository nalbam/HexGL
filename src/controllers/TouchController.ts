/*
 * TouchController (stick + buttons) for touch devices.
 * Based on the touch demo by Seb Lee-Delisle <http://seb.ly/>
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 */

export type TouchButtonCallback = (pressed: boolean, touch: Touch, event: TouchEvent) => void;

/** Internal 2D vector. */
class Vec2 {
  x: number;
  y: number;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  substract(vec: Vec2): this {
    this.x -= vec.x;
    this.y -= vec.y;
    return this;
  }
  copy(vec: Vec2): this {
    this.x = vec.x;
    this.y = vec.y;
    return this;
  }
  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
}

export class TouchController {
  static isCompatible(): boolean {
    return 'ontouchstart' in document.documentElement;
  }

  dom: HTMLElement | Document;
  stickMargin: number;
  buttonCallback: TouchButtonCallback | null;
  active: boolean;
  touches: TouchList | null;
  stickID: number;
  stickPos: Vec2;
  stickStartPos: Vec2;
  stickVector: Vec2;

  constructor(dom: HTMLElement | Document, stickMargin?: number, buttonCallback?: TouchButtonCallback) {
    this.dom = dom;
    this.stickMargin = stickMargin != null ? stickMargin : 200;
    this.buttonCallback = buttonCallback != null ? buttonCallback : null;
    this.active = true;
    this.touches = null;
    this.stickID = -1;
    this.stickPos = new Vec2(0, 0);
    this.stickStartPos = new Vec2(0, 0);
    this.stickVector = new Vec2(0, 0);
    this.dom.addEventListener('touchstart', (e) => this.touchStart(e as TouchEvent), false);
    this.dom.addEventListener('touchmove', (e) => this.touchMove(e as TouchEvent), false);
    this.dom.addEventListener('touchend', (e) => this.touchEnd(e as TouchEvent), false);
  }

  private touchStart(event: TouchEvent): boolean {
    if (!this.active) return false;
    for (const touch of Array.from(event.changedTouches)) {
      if (this.stickID < 0 && touch.clientX < this.stickMargin) {
        this.stickID = touch.identifier;
        this.stickStartPos.set(touch.clientX, touch.clientY);
        this.stickPos.copy(this.stickStartPos);
        this.stickVector.set(0, 0);
        continue;
      } else if (typeof this.buttonCallback === 'function') {
        this.buttonCallback(true, touch, event);
      }
    }
    this.touches = event.touches;
    return false;
  }

  private touchMove(event: TouchEvent): boolean {
    event.preventDefault();
    if (!this.active) return false;
    for (const touch of Array.from(event.changedTouches)) {
      if (this.stickID === touch.identifier && touch.clientX < this.stickMargin) {
        this.stickPos.set(touch.clientX, touch.clientY);
        this.stickVector.copy(this.stickPos).substract(this.stickStartPos);
        break;
      }
    }
    this.touches = event.touches;
    return false;
  }

  private touchEnd(event: TouchEvent): boolean {
    if (!this.active) return false;
    this.touches = event.touches;
    for (const touch of Array.from(event.changedTouches)) {
      if (this.stickID === touch.identifier) {
        this.stickID = -1;
        this.stickVector.set(0, 0);
        break;
      } else if (typeof this.buttonCallback === 'function') {
        this.buttonCallback(false, touch, event);
      }
    }
    return false;
  }
}
