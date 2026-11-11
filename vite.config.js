import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  server: {
    watch: {
      // file data user (Excel/csv) sering terkunci Excel → jangan di-watch, Vite crash EBUSY
      ignored: ['**/*.xlsx', '**/*.xls', '**/*.xlsm', '**/*.csv'],
    },
  },
})
