import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/rag109/',
  plugins: [react()],
  server: {                                     // 允许内网穿透的映射网址公网访问
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: ['108sn64tu8943.vicp.fun']
  },
})
