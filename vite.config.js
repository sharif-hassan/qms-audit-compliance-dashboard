import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend calls the API with relative paths; in development Vite
// forwards them to the Express server so no backend URL is hard-coded.
const API_TARGET = process.env.VITE_API_TARGET || "http://localhost:3001";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": API_TARGET,
      "/auth": API_TARGET,
      "/uploads": API_TARGET,
    },
  },
});
