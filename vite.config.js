import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        // Ensure favicon and any static assets are available to the SW
        "favicon.svg",
      ],
      manifest: {
        name: "diapaudio",
        short_name: "diapaudio",
        description: "Playback photos synced with recordings of that day.",
        start_url: ".",
        scope: ".",
        display: "standalone",
        theme_color: "#0f172a",
        background_color: "#ffffff",
        lang: "en",
        icons: [
          // SVG icon works in modern browsers; for iOS add PNG icons later
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: [
          "**/*.{js,css,html,svg,png,ico,webmanifest}",
        ],
        // Use a relative fallback so it works with non-root base paths (e.g., GitHub Pages)
        navigateFallback: "index.html",
      },
      devOptions: {
        enabled: false, // set to true to test PWA in dev
      },
    }),
    // Bundle analyzer - generates stats.html in dist/ after build
    visualizer({
      filename: "./dist/stats.html",
      open: false, // set to true to open in browser after build
      gzipSize: true,
      brotliSize: true,
      template: "treemap", // treemap, sunburst, network
    }),
  ],
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
