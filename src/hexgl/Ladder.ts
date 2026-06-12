/*
 * HexGL — hall-of-fame ladder (server-backed; largely inert in standalone play).
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 * @license CC BY-NC 3.0
 */
import { request } from '../core/Utils';
import { Timer } from '../core/Timer';

export const Ladder: {
  global: Record<string, any>;
  load(callback?: () => void): void;
  displayLadder(id: string, track: string, mode: string, num?: number): void;
} = {
  global: {},

  load(callback) {
    const s = encodeURIComponent(window.location.href);
    request(
      'nothing',
      false,
      (req) => {
        try {
          Ladder.global = JSON.parse(req.responseText);
          if (callback) callback.call(window);
        } catch (e) {
          console.warn('Unable to load ladder. ' + e);
        }
      },
      { u: s }
    );
  },

  displayLadder(id, track, mode, num) {
    const d = document.getElementById(id);
    if (d == undefined || Ladder.global[track] == undefined || Ladder.global[track][mode] == undefined) {
      console.warn('Undefined ladder.');
      return;
    }

    const l = Ladder.global[track][mode];
    let h = '';
    for (let i = 0; i < l.length - 1; i++) {
      const t = Timer.msToTime(l[i]['score']);
      h += '<span class="ladder-row"><b>' + (i + 1) + '. ' + l[i]['name'] + '</b><i>' + t.m + "'" + t.s + "''" + t.ms + '</i></span>';
    }

    d.innerHTML = h;
  },
};
