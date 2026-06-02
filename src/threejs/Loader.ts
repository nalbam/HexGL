/*
 * Loads multiple resources (textures, cube maps, geometries, analysers, images,
 * sounds) with progress callbacks.
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 */
import * as THREE from 'three';
import { ImageDataLoader } from '../core/ImageData';
import { Audio } from '../core/Audio';

type LoaderType = 'textures' | 'texturesCube' | 'geometries' | 'analysers' | 'images' | 'sounds';

const LOADER_TYPES: LoaderType[] = ['textures', 'texturesCube', 'geometries', 'analysers', 'images', 'sounds'];

export interface LoaderCallbacks {
  onLoad?: () => void;
  onError?: (name: string) => void;
  onProgress?: (progress: LoaderProgress, type?: LoaderType, name?: string) => void;
}

export interface LoaderProgress {
  total: number;
  remaining: number;
  loaded: number;
  finished: boolean;
}

export interface LoadManifest {
  textures?: Record<string, string>;
  texturesCube?: Record<string, string>;
  geometries?: Record<string, string>;
  analysers?: Record<string, string>;
  images?: Record<string, string>;
  sounds?: Record<string, { src: string; loop: boolean; usePanner?: boolean }>;
}

/** A color texture (diffuse/banner/sprite/hud) → sRGB; data textures (normal/specular) → linear. */
function isColorTexture(name: string): boolean {
  return !/normal|specular/i.test(name);
}

export class Loader {
  private bufferGeometryLoader = new THREE.BufferGeometryLoader();
  private textureLoader = new THREE.TextureLoader();
  private cubeTextureLoader = new THREE.CubeTextureLoader();

  errorCallback: (name: string) => void;
  loadCallback: () => void;
  progressCallback: (progress: LoaderProgress, type?: LoaderType, name?: string) => void;

  data: Record<LoaderType, Record<string, any>>;
  states: Record<LoaderType, Record<string, boolean>>;
  progress: LoaderProgress;

  constructor(opts: LoaderCallbacks) {
    this.errorCallback = opts.onError || ((s) => console.warn(`Error while loading ${s}.`));
    this.loadCallback = opts.onLoad || (() => console.log('Loaded.'));
    this.progressCallback = opts.onProgress || (() => {});

    this.data = {} as any;
    this.states = {} as any;
    for (const t of LOADER_TYPES) {
      this.data[t] = {};
      this.states[t] = {};
    }

    this.progress = { total: 0, remaining: 0, loaded: 0, finished: false };
  }

  load(data: LoadManifest): void {
    for (const k of LOADER_TYPES) {
      const group = (data as any)[k];
      if (group) {
        const size = Object.keys(group).length;
        this.progress.total += size;
        this.progress.remaining += size;
      }
    }

    for (const t in data.textures) this.loadTexture(t, data.textures[t]);
    for (const c in data.texturesCube) this.loadTextureCube(c, data.texturesCube[c]);
    for (const g in data.geometries) this.loadGeometry(g, data.geometries[g]);
    for (const a in data.analysers) this.loadAnalyser(a, data.analysers[a]);
    for (const i in data.images) this.loadImage(i, data.images[i]);
    for (const s in data.sounds) this.loadSound(data.sounds[s].src, s, data.sounds[s].loop);

    this.progressCallback.call(this, this.progress);
  }

  private updateState(type: LoaderType, name: string, state: boolean): void {
    if (state === true) {
      this.progress.remaining--;
      this.progress.loaded++;
      this.progressCallback.call(this, this.progress, type, name);
    }
    this.states[type][name] = state;
    if (this.progress.loaded === this.progress.total) {
      this.loadCallback.call(this);
    }
  }

  get(type: LoaderType, name: string): any {
    if (!(type in this.data)) {
      console.warn('Unknown loader type.');
      return null;
    }
    if (!(name in this.data[type])) {
      console.warn('Unknown file.');
      return null;
    }
    return this.data[type][name];
  }

  loaded(type: LoaderType, name: string): boolean | null {
    if (!(type in this.states)) return null;
    if (!(name in this.states[type])) return null;
    return this.states[type][name];
  }

  private loadTexture(name: string, url: string): void {
    this.updateState('textures', name, false);
    this.data.textures[name] = this.textureLoader.load(
      url,
      (tex) => {
        tex.colorSpace = isColorTexture(name) ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        this.updateState('textures', name, true);
      },
      undefined,
      () => this.errorCallback.call(this, name)
    );
  }

  private loadTextureCube(name: string, url: string): void {
    const urls = [
      url.replace('%1', 'px'), url.replace('%1', 'nx'),
      url.replace('%1', 'py'), url.replace('%1', 'ny'),
      url.replace('%1', 'pz'), url.replace('%1', 'nz'),
    ];
    this.updateState('texturesCube', name, false);
    this.data.texturesCube[name] = this.cubeTextureLoader.load(urls, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      this.updateState('texturesCube', name, true);
    });
  }

  private loadGeometry(name: string, url: string): void {
    this.data.geometries[name] = null;
    this.updateState('geometries', name, false);
    this.bufferGeometryLoader.load(url, (geometry) => {
      this.data.geometries[name] = geometry;
      this.updateState('geometries', name, true);
    });
  }

  private loadAnalyser(name: string, url: string): void {
    this.updateState('analysers', name, false);
    this.data.analysers[name] = new ImageDataLoader(url, () => {
      this.updateState('analysers', name, true);
    });
  }

  private loadImage(name: string, url: string): void {
    this.updateState('images', name, false);
    const e = new Image();
    e.onload = () => this.updateState('images', name, true);
    e.crossOrigin = 'anonymous';
    e.src = url;
    this.data.images[name] = e;
  }

  private loadSound(src: string, name: string, loop: boolean): void {
    this.updateState('sounds', name, false);
    Audio.addSound(src, name, loop, () => {
      this.updateState('sounds', name, true);
    });
    this.data.sounds[name] = {
      play: () => Audio.play(name),
      stop: () => Audio.stop(name),
      volume: (vol: number) => Audio.volume(name, vol),
    };
  }
}
