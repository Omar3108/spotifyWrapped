import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.js"],
  },
  server: {
    host: true,
    port: 5173,
    // Para probar contra la API de Docker (que no publica puertos) pasando por nginx:
    //   API_TARGET=https://localhost VITE_API_BASE=/api/wrapped npm run dev
    proxy: process.env.API_TARGET
      ? { "/api": { target: process.env.API_TARGET, changeOrigin: true, secure: false } }
      : undefined,
  },
});
