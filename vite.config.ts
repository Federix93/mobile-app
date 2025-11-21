import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_DATABRICKS_HOST || 'https://your-workspace.cloud.databricks.com',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Add the token from env to the request
              if (env.VITE_DATABRICKS_TOKEN) {
                proxyReq.setHeader('Authorization', `Bearer ${env.VITE_DATABRICKS_TOKEN}`);
              }
              console.log('🔄 Proxying request:', req.method, req.url, '→', proxyReq.path);
            });
            proxy.on('error', (err, _req, _res) => {
              console.error('❌ Proxy error:', err);
            });
          },
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    }
  }
})

