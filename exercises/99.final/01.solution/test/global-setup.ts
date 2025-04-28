import { spawn } from 'child_process'

export default async function globalSetup() {
	return new Promise((resolve, reject) => {
		const server = spawn('npm', ['run', 'dev:mcp'], {
			stdio: ['ignore', 'pipe', 'pipe'],
		})

		if (!server) {
			reject(new Error('Failed to spawn EpicMeMCP process'))
			return
		}

		const timeout = setTimeout(() => {
			server.kill()
			reject(new Error('EpicMeMCP failed to start within 5 seconds'))
		}, 5000)

		server.stdout?.on('data', (data) => {
			const output = data.toString()
			const urlMatch = output.match(/Ready on (http:\/\/localhost:\d+)/)
			if (urlMatch) {
				const serverUrl = urlMatch[1]
				process.env.MCP_BASE_URL = serverUrl
				clearTimeout(timeout)
				resolve(() => {
					server.kill()
				})
			}
			// Log all output if VERBOSE is set
			if (process.env.VERBOSE) {
				console.log('Server output:', output)
			}
		})

		server.stderr?.on('data', (data) => {
			console.error(String(data))
		})

		server.on('close', (code) => {
			clearTimeout(timeout)
			if (code !== 0) {
				reject(new Error('EpicMeMCP failed to start'))
			}
		})

		server.on('error', (error) => {
			clearTimeout(timeout)
			reject(error)
		})
	})
}
