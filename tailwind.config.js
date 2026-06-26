/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 暗色科技风色板
        primary: "#0ea5e9",
        "primary-dark": "#0284c7",
        "primary-light": "#38bdf8",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        // 背景色
        "bg-main": "#0a0e17",
        "bg-card": "#111827",
        "bg-input": "#1f2937",
        // 边框
        "border-card": "#1f2937",
        "border-hover": "#0ea5e9",
      },
      // 响应式断点
      screens: {
        'xl': '1200px',
        'lg': '900px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
    },
  },
  plugins: [],
};
