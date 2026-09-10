import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Minimal build of the throwaway consumer — proves the packed ESM output
// actually bundles into an app. Not part of the library.
export default defineConfig({ plugins: [react()] })
