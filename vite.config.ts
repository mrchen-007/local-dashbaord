import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import path from "path";

// Vite配置，支持WASM和Tauri
export default defineConfig({
  plugins: [react(), wasm()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Tauri需要相对路径
  base: "./",
  // 服务器配置
  server: {
    port: 1420,
    strictPort: true,
  },
  // 构建配置
  build: {
    // Tauri在Windows上使用Chromium，在macOS上使用WebKit
    target: process.env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13",
    // 生产环境不压缩，调试时便于查看
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // 生产环境启用sourcemap
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
