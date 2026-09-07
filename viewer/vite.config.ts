import { defineConfig } from "vite";

export default defineConfig({
  // Patched for USD 4D BIM: this build is served mounted under /viewer/ by the
  // FastAPI backend (StaticFiles), not from the app root.
  base: "/viewer/",
  resolve: {
    alias: {
      "three/tsl": "three/src/Three.TSL.js",
    },
  },
  optimizeDeps: {
    exclude: ["@sparkjsdev/spark"],
  },
  server: {
    host: "127.0.0.1",
    port: 8000,
    strictPort: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 8000,
    strictPort: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  },
});
