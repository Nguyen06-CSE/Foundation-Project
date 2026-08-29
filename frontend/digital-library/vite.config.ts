import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- Import thêm dòng này

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- Khai báo plugin ở đây
  ],
})