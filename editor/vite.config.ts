import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["edit.survey.localhost", "edit.survey.team-ensemble.ch"],
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});
