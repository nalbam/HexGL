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

type Setting = [string, string[], number, number, string];

const defaultControls = isTouchDevice() ? 1 : 0;

const s: Setting[] = [
  ['controlType', ['KEYBOARD', 'TOUCH', 'LEAP MOTION CONTROLLER', 'GAMEPAD'], defaultControls, defaultControls, 'Controls: '],
  ['quality', ['LOW', 'MID', 'HIGH', 'VERY HIGH'], 3, 3, 'Quality: '],
  ['hud', ['OFF', 'ON'], 1, 1, 'HUD: '],
  ['godmode', ['OFF', 'ON'], 0, 1, 'Godmode: '],
];

for (const a of s) {
  const fromUrl = getURLParameter(a[0]);
  a[3] = fromUrl != null ? parseInt(fromUrl, 10) : a[2];
  const e = $('s-' + a[0]);
  const f = () => {
    e.innerHTML = a[4] + a[1][a[3]];
  };
  f();
  e.onclick = () => {
    a[3] = (a[3] + 1) % a[1].length;
    f();
  };
}

$('step-2').onclick = () => {
  $('step-2').style.display = 'none';
  $('step-3').style.display = 'block';
  init(s[0][3], s[1][3], s[2][3], s[3][3]);
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
    $('step-2').style.backgroundImage = 'url(css/help-' + s[0][3] + '.png)';
  };
}
