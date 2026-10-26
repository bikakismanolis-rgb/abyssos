// One GLTFLoader for every model in the game. GLTFLoader turns an embedded image into a blob: URL and fetches it;
// a page served under a strict Content-Security-Policy (the published artifact) refuses that fetch, and every model
// comes out white. Here embedded images are decoded straight from their bytes (createImageBitmap on a Blob, as
// env.js does for the ground layers), which no CSP governs; anything else, or a failure, takes the loader's own path.
import { Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { R } from './gfx.js';

// Memory (a phone's tab dies past about a gigabyte): on low and medium quality, and on phones, a map of 1024 px or more is
// decoded at half size (a creature or a person covers 100-200 px on a phone's screen; the ground's mips never reach the
// top level from the camera's height); and every decoded image is let go once the GPU has it (texture.onUpdate). Only
// a lost GL context would need it again: gfx.js then saves and reloads the page instead (onContextLost).
export const halfMaps = () => R.quality <= 1 || R.mobile;
export async function shrink(bmp, opts) {
  if (!halfMaps() || Math.max(bmp.width, bmp.height) < 1024) return bmp;
  const s = await createImageBitmap(bmp, { ...opts, resizeWidth: bmp.width >> 1, resizeHeight: bmp.height >> 1, resizeQuality: 'high' });
  bmp.close();
  return s;
}
// (not when two textures share the image, as the loader's clones do: one may still need its own upload, other settings)
const SHARED = new WeakSet();
export function release(t) {
  const d = t.source.data;
  if (!SHARED.has(t.source) && typeof ImageBitmap !== 'undefined' && d instanceof ImageBitmap) d.close();
}

class DirectImages {
  constructor(parser) {
    this.name = 'skotos_direct_images';
    if (typeof createImageBitmap === 'undefined') return;
    const own = parser.loadImageSource.bind(parser);
    parser.loadImageSource = (i, loader) => {
      const def = parser.json.images[i];
      if (def.bufferView === undefined) return own(i, loader);
      if (parser.sourceCache[i] !== undefined) return parser.sourceCache[i].then((t) => { SHARED.add(t.source); return t.clone(); });
      // the same options three's ImageBitmapLoader gives GLTFLoader
      const opts = { premultiplyAlpha: 'none', colorSpaceConversion: 'none' };
      const p = parser.getDependency('bufferView', def.bufferView)
        .then((buf) => createImageBitmap(new Blob([buf], { type: def.mimeType }), opts))
        .then((bmp) => shrink(bmp, opts))
        .then((bmp) => {
          const t = new Texture(bmp);
          t.needsUpdate = true;
          t.userData.mimeType = def.mimeType;
          t.onUpdate = release;
          return t;
        })
        .catch(() => { delete parser.sourceCache[i]; return own(i, loader); });
      parser.sourceCache[i] = p;
      return p;
    };
  }
}

export const gltfLoader = () => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register((parser) => new DirectImages(parser));
