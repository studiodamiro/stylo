import { resolve } from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// `vite` / `vite dev` serves the playground; `vite build` builds the library bundle.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  root: command === "build" ? import.meta.dirname : resolve(import.meta.dirname, "playground"),
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "stylo",
    },
    cssCodeSplit: false,
    sourcemap: true,
    // Single stylesheet, stable name: consumers import "@damiro/stylo/styles.css".
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: { assetFileNames: "styles.css" },
    },
  },
}))
