import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'happy-dom',
		globals: true,
		setupFiles: ['./tests/setup-runes.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'dist/',
				'examples/',
				'migration/',
				'**/*.d.ts',
				'**/*.config.*',
			],
			thresholds: {
				global: {
					branches: 80,
					functions: 80,
					lines: 80,
					statements: 80,
				},
			},
		},
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
		exclude: ['node_modules/', 'dist/', 'examples/', 'migration/'],
	},
	resolve: {
		alias: {
			'@': '/src',
		},
	},
});
