import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      JWT_SECRET: 'test-secret-test-secret-test-secret-123456',
    },
  },
});
