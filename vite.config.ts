import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Maps process.env.API_KEY in code to the build-time env variable
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});