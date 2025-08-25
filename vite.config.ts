import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 開発: base="/"（http://localhost:5173/ でOK）
// 本番ビルド: base="/noirchord/"（GitHub Pages用）
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/noirchord/' : '/',
}))
