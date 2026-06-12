/*
 * HexGL — entry point: start menu wiring + HexGL instantiation.
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 */
import { HexGL } from './hexgl/HexGL';
import { getURLParameter, isTouchDevice } from './core/Utils';

const $ = (id: string): HTMLElement => document.getElementById(id)!;

function init(controlType: number, quality: number, hud: number, godmode: number): void {
  const hexGL = new HexGL({
    document,
    width: window.innerWidth,
    height: window.innerHeight,
    container: $('main'),
    overlay: $('overlay'),
    gameover: $('step-5'),
    quality,
    difficulty: 0,
    hud: hud === 1,
    controlType,
    godmode: godmode === 1,
    track: 'Cityscape',
  });
  (window as any).hexGL = hexGL;

  const progressbar = $('progressbar');
  hexGL.load({
    onLoad() {
      console.log('LOADED.');
      hexGL.init();
      $('step-3').style.display = 'none';
      $('step-4').style.display = 'block';
      hexGL.start();
    },
    onError(s: string) {
      console.error('Error loading ' + s + '.');
    },
    onProgress(p: { loaded: number; total: number }, t?: string, n?: string) {
      console.log('LOADED ' + t + ' : ' + n + ' ( ' + p.loaded + ' / ' + p.total + ' ).');
      progressbar.style.width = '' + (p.loaded / p.total) * 100 + '%';
    },
  });
}

// [name, labels, values (actual setting passed to HexGL), defaultIndex, currentIndex, prefix]
type Setting = [string, string[], number[], number, number, string];

const defaultControls = isTouchDevice() ? 1 : 0;

// controlType values map to ShipControls: 0=keyboard, 1=touch, 3=gamepad.
const s: Setting[] = [
  ['controlType', ['KEYBOARD', 'TOUCH', 'GAMEPAD'], [0, 1, 3], defaultControls, defaultControls, 'Controls: '],
  ['quality', ['LOW', 'MID', 'HIGH', 'VERY HIGH'], [0, 1, 2, 3], 3, 3, 'Quality: '],
  ['hud', ['OFF', 'ON'], [0, 1], 1, 1, 'HUD: '],
  ['godmode', ['OFF', 'ON'], [0, 1], 0, 1, 'Godmode: '],
];

for (const a of s) {
  const fromUrl = getURLParameter(a[0]);
  const urlIndex = fromUrl != null ? a[2].indexOf(parseInt(fromUrl, 10)) : -1;
  a[4] = urlIndex !== -1 ? urlIndex : a[3];
  const e = $('s-' + a[0]);
  const f = () => {
    e.innerHTML = a[5] + a[1][a[4]];
  };
  f();
  e.onclick = () => {
    a[4] = (a[4] + 1) % a[1].length;
    f();
  };
}

$('step-2').onclick = () => {
  $('step-2').style.display = 'none';
  $('step-3').style.display = 'block';
  init(s[0][2][s[0][4]], s[1][2][s[1][4]], s[2][2][s[2][4]], s[3][2][s[3][4]]);
};

$('step-5').onclick = () => {
  window.location.reload();
};

$('s-credits').onclick = () => {
  $('step-1').style.display = 'none';
  $('credits').style.display = 'block';
};

$('credits').onclick = () => {
  $('step-1').style.display = 'block';
  $('credits').style.display = 'none';
};

function hasWebGL(): boolean {
  let gl: RenderingContext | null = null;
  const canvas = document.createElement('canvas');
  try {
    gl = canvas.getContext('webgl');
  } catch (e) {
    /* noop */
  }
  if (gl == null) {
    try {
      gl = canvas.getContext('experimental-webgl');
    } catch (e) {
      /* noop */
    }
  }
  return gl != null;
}

if (!hasWebGL()) {
  const getWebGL = $('start');
  getWebGL.innerHTML = 'WebGL is not supported!';
  getWebGL.onclick = () => {
    window.location.href = 'http://get.webgl.org/';
  };
} else {
  $('start').onclick = () => {
    $('step-1').style.display = 'none';
    $('step-2').style.display = 'block';
    $('step-2').style.backgroundImage = 'url(css/help-' + s[0][2][s[0][4]] + '.png)';
  };
}
