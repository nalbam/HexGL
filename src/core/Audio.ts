/*
 * Web Audio API wrapper with a graceful <audio> fallback. THREE-free.
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 */
import type * as THREE from 'three';

interface Sound {
  src: AudioBuffer | null;
  gainNode: GainNode | null;
  bufferNode: AudioBufferSourceNode | null;
  loop: boolean;
}

interface AudioModule {
  sounds: Record<string, any>;
  _ctx: AudioContext | null;
  _panner?: PannerNode;
  _unlocked: boolean;
  posMultipler: number;
  init(): void;
  unlock(): void;
  addSound(src: string, id: string, loop: boolean, callback: () => void, usePanner?: boolean): void;
  play(id: string): void;
  stop(id: string): void;
  volume(id: string, volume: number): void;
  setListenerPos(vec: THREE.Vector3): void;
  setListenerVelocity(vec: THREE.Vector3): void;
}

export const Audio: AudioModule = {
  sounds: {},
  _ctx: null,
  _unlocked: false,
  posMultipler: 1.5,

  init() {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) {
      Audio._ctx = new Ctx();
      Audio._panner = Audio._ctx.createPanner();
      Audio._panner.connect(Audio._ctx.destination);
    } else {
      Audio._ctx = null;
    }
    Audio.posMultipler = 1.5;

    const unlock = () => Audio.unlock();
    document.addEventListener('pointerdown', unlock, false);
    document.addEventListener('keydown', unlock, false);
  },

  unlock() {
    const ctx = Audio._ctx;
    if (!ctx || Audio._unlocked) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        Audio._unlocked = true;
      }).catch(() => {});
    } else {
      Audio._unlocked = true;
    }
  },

  addSound(src, id, loop, callback, usePanner) {
    const ctx = Audio._ctx;
    let audio: any = new (window as any).Audio();

    if (ctx) {
      audio = { src: null, gainNode: null, bufferNode: null, loop } as Sound;
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'arraybuffer';

      xhr.onload = () => {
        ctx.decodeAudioData(
          xhr.response,
          (b) => {
            const gainNode = ctx.createGain();
            if (usePanner === true) {
              gainNode.connect(Audio._panner!);
            } else {
              gainNode.connect(ctx.destination);
            }
            audio.src = b;
            audio.gainNode = gainNode;
            callback();
          },
          (e) => {
            console.error('Audio decode failed!', e);
          }
        );
      };

      xhr.open('GET', src, true);
      xhr.send(null);
    } else {
      // Workaround for old Safari
      audio.addEventListener(
        'canplay',
        () => {
          audio.pause();
          audio.currentTime = 0;
          callback();
        },
        false
      );
      audio.autoplay = true;
      audio.loop = loop;
      audio.src = src;
    }

    Audio.sounds[id] = audio;
  },

  play(id) {
    const ctx = Audio._ctx;
    if (ctx) {
      if (!Audio._unlocked && ctx.state === 'suspended') return;

      const playSound = () => {
        const sound = ctx.createBufferSource();
        sound.connect(Audio.sounds[id].gainNode);
        sound.buffer = Audio.sounds[id].src;
        sound.loop = Audio.sounds[id].loop;
        Audio.sounds[id].gainNode.gain.value = 1;
        Audio.sounds[id].bufferNode = sound;
        (sound as any).start ? sound.start(0) : (sound as any).noteOn(0);
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(playSound).catch(() => {});
      } else {
        playSound();
      }
    } else {
      if (Audio.sounds[id].currentTime > 0) {
        Audio.sounds[id].pause();
        Audio.sounds[id].currentTime = 0;
      }
      Audio.sounds[id].play().catch(() => {});
    }
  },

  stop(id) {
    const ctx = Audio._ctx;
    if (ctx) {
      if (Audio.sounds[id].bufferNode !== null) {
        const bufferNode = Audio.sounds[id].bufferNode;
        bufferNode.stop ? bufferNode.stop(ctx.currentTime) : (bufferNode as any).noteOff(ctx.currentTime);
      }
    } else {
      Audio.sounds[id].pause();
      Audio.sounds[id].currentTime = 0;
    }
  },

  volume(id, volume) {
    const ctx = Audio._ctx;
    if (ctx) {
      Audio.sounds[id].gainNode.gain.value = volume;
    } else {
      Audio.sounds[id].volume = volume;
    }
  },

  setListenerPos(vec) {
    if (Audio._ctx) {
      const panner = Audio._panner!;
      const vec2 = vec.normalize();
      panner.setPosition(
        vec2.x * Audio.posMultipler,
        vec2.y * Audio.posMultipler,
        vec2.z * Audio.posMultipler
      );
    }
  },

  setListenerVelocity(_vec) {
    if (Audio._ctx) {
      // const panner = Audio._panner;
      // panner.setVelocity(vec.x, vec.y, vec.z);
    }
  },
};

Audio.init();
