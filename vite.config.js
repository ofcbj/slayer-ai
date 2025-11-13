import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages에서 호스팅할 때 저장소 이름을 base로 설정
  base: process.env.NODE_ENV === 'production' ? '/slayer-ai/' : './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    extensions: ['.ts', '.js', '.json']
  }
});
