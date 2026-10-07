// One GLTFLoader for every model in the game. GLTFLoader turns an embedded image into a blob: URL and fetches it;
// a page served under a strict Content-Security-Policy (the published artifact) refuses that fetch, and every model
// comes out white. Here embedded images are decoded straight from their bytes (createImageBitmap on a Blob, as
// env.js does for the ground layers), which no CSP governs; anything else, or a failure, takes the loader's own path.
import { Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

class DirectImages {
  constructor(parser) {
    this.name = 'skotos_direct_images';
    if (typeof createImageBitmap === 'undefined') return;
    const own = parser.loadImageSource.bind(parser);
    parser.loadImageSource = (i, loader) => {
      const def = parser.json.images[i];
      if (def.bufferView === undefined) return own(i, loader);
      if (parser.sourceCache[i] !== undefined) return parser.sourceCache[i].then((t) => t.clone());
      const p = parser.getDependency('bufferView', def.bufferView)
        // the same options three's ImageBitmapLoader gives GLTFLoader
        .then((buf) => createImageBitmap(new Blob([buf], { type: def.mimeType }), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
        .then((bmp) => {
          const t = new Texture(bmp);
          t.needsUpdate = true;
          t.userData.mimeType = def.mimeType;
          return t;
        })
        .catch(() => { delete parser.sourceCache[i]; return own(i, loader); });
      parser.sourceCache[i] = p;
      return p;
    };
  }
}

export const gltfLoader = () => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register((parser) => new DirectImages(parser));
