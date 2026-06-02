/*
 * HexGL — records ship position/rotation for replay and interpolation.
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 * @license CC BY-NC 3.0
 */
import * as THREE from 'three';
import type { ShipControls } from './ShipControls';

export type RaceFrame = [number, number, number, number, number, number, number, number];

export class RaceData {
  track: any;
  mode: string;
  shipControls: ShipControls;

  rate = 2; // 1 / rate
  rateState = 1;

  data: RaceFrame[] = [];
  last = -1;
  seek = 0;

  private _p = new THREE.Vector3();
  private _pp = new THREE.Vector3();
  private _np = new THREE.Vector3();
  private _q = new THREE.Quaternion();
  private _pq = new THREE.Quaternion();
  private _nq = new THREE.Quaternion();

  constructor(track: any, mode: string, shipControls: ShipControls) {
    this.track = track;
    this.mode = mode;
    this.shipControls = shipControls;
  }

  tick(time: number): void {
    if (this.rateState == 1) {
      const p = this.shipControls.getPosition();
      const q = this.shipControls.getQuaternion();
      this.data.push([time, p.x, p.y, p.z, q.x, q.y, q.z, q.w]);
      ++this.last;
    } else if (this.rateState == this.rate) {
      this.rateState = 0;
    }
    this.rate++;
  }

  applyInterpolated(time: number): void {
    while (this.seek < this.last && this.data[this.seek + 1][0] < time) ++this.seek;

    const prev = this.data[this.seek];
    this._pp.set(prev[1], prev[2], prev[3]);
    this._pq.set(prev[4], prev[5], prev[6], prev[7]);

    if (this.seek < 0) {
      console.warn('Bad race data.');
      return;
    }

    // no interpolation
    if (this.seek == this.last || this.seek == 0) this.shipControls.teleport(this._pp, this._pq);

    // interpolation
    const next = this.data[this.seek + 1];
    this._np.set(next[1], next[2], next[3]);
    this._nq.set(next[4], next[5], next[6], next[7]);

    const t = (time - prev[0]) / (next[0] - prev[0]);
    this._p.copy(this._pp).lerp(this._np, t);
    this._q.copy(this._pq).slerp(this._nq, t);

    this.shipControls.teleport(this._p, this._q);
  }

  reset(): void {
    this.seek = 0;
  }

  export(): RaceFrame[] {
    return this.data;
  }

  import(imp: RaceFrame[]): void {
    this.data = imp;
    this.last = this.data.length - 1;
  }
}
