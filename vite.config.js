import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Set base path for GitHub Pages when publishing to /<repo>/
  // Use VITE_BASE env to override in CI. Defaults to "/" for local dev,
  // and "/diapaudio/" when process.env.GHPAGES is set (CI workflow below)
  base: process.env.VITE_BASE || (process.env.GHPAGES === "true" ? "/diapaudio/" : "/"),
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor libraries for better caching
          'vendor-react': ['react', 'react-dom'],
          'vendor-i18n': ['react-i18next', 'i18next'],
          'vendor-ui': ['react-dropzone', 'react-hotkeys-hook'],
          'vendor-data': ['zustand', 'date-fns'],
          // ZIP is lazy-loaded only when processing files
          'vendor-zip': ['@zip.js/zip.js'],
        },
      },
    },
  },
  // Vitest configuration for unit/component testing
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setupTests.js"],
    globals: true,
    css: true,
    coverage: {
      reporter: ["text", "html", "lcov"],
      provider: "v8",
      include: ["src/**/*.{js,jsx}"],
      exclude: [
        "src/test/**",
        "src/**/index.js",
        "src/main.jsx",
        "**/*.css",
      ],
    },
    include: [
      "src/**/test/**/*.{test,spec}.{js,jsx}",
    ],
  },
});
