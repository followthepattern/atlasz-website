import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// In dev, proxy the lead endpoint to the backend so the browser talks to a single
// origin (no CORS). In production the site is static and calls VITE_API_BASE_URL.
const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://localhost:8081";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    // Anything imported from three/examples gets pre-bundled by Vite with its
    // own copy of three, which yields "Multiple instances of Three.js being
    // imported" and helpers that operate on foreign classes. It only shows up
    // in dev — the production bundle resolves to a single copy either way.
    dedupe: ["three"],
  },
  server: {
    host: true,
    port: 3001,
    proxy: {
      "/api": { target: backendOrigin, changeOrigin: true },
      "/subscribe": { target: backendOrigin, changeOrigin: true },
    },
  },
});
