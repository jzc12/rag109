import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

// https://vite.dev/config/
export default defineConfig({
  base: '/rag109/',  // 确保这里的名称与你的 GitHub 仓库名一致
  plugins: [react()],
  server: {                                     // 允许内网穿透的映射网址公网访问
    host: '0.0.0.0',
    port: 9090,
    allowedHosts: ['https://108sn64tu8943.vicp.fun']
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  assetsDir: 'assets',
})
