import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build`                 -> dist/           static site (models as separate .glb files)
// `vite build --mode artifact` -> dist-artifact/  same, with the models inlined into the scripts
// `vite build --mode single`   -> release/        one self-contained index.html
export default defineConfig(({ mode }) => {
  const single = mode === 'single', artifact = mode === 'artifact';
  return {
    base: './',
    build: {
      target: 'es2020',
      outDir: single ? 'release' : artifact ? 'dist-artifact' : 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 6000,
      assetsInlineLimit: single || artifact ? 1e8 : 4096
    },
    plugins: single ? [viteSingleFile()] : []
  };
});
