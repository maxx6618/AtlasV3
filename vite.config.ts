import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 4321,
        strictPort: true,
        host: '0.0.0.0',
      },
      preview: {
        port: 4173,
        host: '0.0.0.0',
        strictPort: true,
      },
      plugins: [react()],
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return;
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('@google/genai')) return 'ai';
              if (id.includes('@supabase/supabase-js')) return 'supabase';
              if (id.includes('recharts')) return 'charts';
              if (id.includes('xlsx')) return 'xlsx';
              if (id.includes('papaparse')) return 'papaparse';
              return 'vendor';
            }
          }
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
