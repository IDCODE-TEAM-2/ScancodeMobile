import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8081',
    specPattern: 'cypress/e2e/*.{cy,spec}.{js,jsx,ts,tsx}',
    supportFile: false,
  },
});
