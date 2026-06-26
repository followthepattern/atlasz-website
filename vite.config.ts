import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// In dev, proxy /api to the backend so the browser talks to a single origin
// (no CORS). In production the site is static and calls VITE_API_BASE_URL.
const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 3001,
    proxy: {
      "/api": { target: backendOrigin, changeOrigin: true },
    },
  },
});
