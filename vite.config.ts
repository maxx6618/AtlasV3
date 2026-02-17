import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 4321,
        strictPort: false,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
          },
        },
      },
      preview: {
        port: 4173,
        host: '0.0.0.0',
        strictPort: false,
      },
      plugins: [react()],
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return;
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('@supabase/supabase-js')) return 'supabase';
              if (id.includes('recharts')) return 'charts';
              if (id.includes('xlsx')) return 'xlsx';
              if (id.includes('papaparse')) return 'papaparse';
              return 'vendor';
            }
          }
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
