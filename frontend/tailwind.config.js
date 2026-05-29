/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tactical: {
          bg: '#0B0F14',       // DRDO Matte Black Canvas
          panel: '#121A22',    // Military Panel Base
          border: '#24303F',   // Steel Gray Panel Dividers
          green: '#00C853',    // DRDO Tactical Green
          greenLight: '#00C853', // Active text green
          red: '#FF3D3D',      // Tactical Threat Alert Red
          redLight: '#FF3D3D',  // Danger highlight red
          blue: '#1f6feb',     // Signal tracking blue
          gray: '#9AA4AE',     // Text Secondary Cool Gray
          text: '#E6EDF3',     // Text Primary Light Warm Gray
          metallic: '#8b949e', // Metallic details
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'Outfit', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        tactical: '0 4px 20px 0 rgba(0, 0, 0, 0.5)',
        glowGreen: '0 0 15px rgba(35, 134, 54, 0.2)',
        glowRed: '0 0 15px rgba(218, 54, 51, 0.2)',
      }
    },
  },
  plugins: [],
}
