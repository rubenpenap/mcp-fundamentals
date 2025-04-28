import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globalSetup: './test/global-setup.ts',
	},
	server: {
		watch: {
			ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
		},
	},
})
