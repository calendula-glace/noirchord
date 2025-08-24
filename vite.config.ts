import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',                 // ← ローカルは '/', Pages のときは '/noirchord/' に変更
  server: { port: 5173 }     // 任意
})
