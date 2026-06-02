/*
 * Loads an image and gives access to its pixel data (collision/height maps).
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 */

export interface Pixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class ImageDataLoader {
  image: HTMLImageElement | null;
  pixels: ImageData | null;
  canvas: HTMLCanvasElement | null;
  loaded: boolean;

  constructor(path: string, callback?: (this: ImageDataLoader) => void) {
    this.image = new Image();
    this.pixels = null;
    this.canvas = null;
    this.loaded = false;

    this.image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = this.image!.width;
      canvas.height = this.image!.height;
      const context = canvas.getContext('2d')!;
      context.drawImage(this.image!, 0, 0);
      this.pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      this.loaded = true;
      this.canvas = null;
      this.image = null;
      if (callback != null) callback.call(this);
    };
    this.image.crossOrigin = 'anonymous';
    this.image.src = path;
  }

  /** Gets pixel RGBA data at the given integer index. */
  getPixel(x: number, y: number): Pixel {
    const p = this.pixels;
    if (p == null || x < 0 || y < 0 || x >= p.width || y >= p.height) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    const i = (y * p.width + x) * 4;
    return { r: p.data[i], g: p.data[i + 1], b: p.data[i + 2], a: p.data[i + 3] };
  }

  /** Gets pixel RGBA data at the given float index using bilinear interpolation. */
  getPixelBilinear(fx: number, fy: number): Pixel {
    const x = Math.floor(fx);
    const y = Math.floor(fy);
    const rx = fx - x - 0.5;
    const ry = fy - y - 0.5;
    const ax = Math.abs(rx);
    const ay = Math.abs(ry);
    const dx = rx < 0 ? -1 : 1;
    const dy = ry < 0 ? -1 : 1;
    const c = this.getPixel(x, y);
    const cx = this.getPixel(x + dx, y);
    const cy = this.getPixel(x, y + dy);
    const cxy = this.getPixel(x + dx, y + dy);
    const cf1 = [
      (1 - ax) * c.r + ax * cx.r,
      (1 - ax) * c.g + ax * cx.g,
      (1 - ax) * c.b + ax * cx.b,
      (1 - ax) * c.a + ax * cx.a,
    ];
    const cf2 = [
      (1 - ax) * cy.r + ax * cxy.r,
      (1 - ax) * cy.g + ax * cxy.g,
      (1 - ax) * cy.b + ax * cxy.b,
      (1 - ax) * cy.a + ax * cxy.a,
    ];
    return {
      r: (1 - ay) * cf1[0] + ay * cf2[0],
      g: (1 - ay) * cf1[1] + ay * cf2[1],
      b: (1 - ay) * cf1[2] + ay * cf2[2],
      a: (1 - ay) * cf1[3] + ay * cf2[3],
    };
  }

  /** Gets pixel data as a 3-byte integer (float-texture ersatz from RGB). */
  getPixelF(x: number, y: number): number {
    const c = this.getPixel(x, y);
    return c.r + c.g * 255 + c.b * 255 * 255;
  }

  /** Bilinear variant of getPixelF. */
  getPixelFBilinear(fx: number, fy: number): number {
    const c = this.getPixelBilinear(fx, fy);
    return c.r + c.g * 255 + c.b * 255 * 255;
  }
}
