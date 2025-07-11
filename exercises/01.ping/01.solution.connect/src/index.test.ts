import {
	Client,
	type ClientOptions,
} from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { test, expect } from 'vitest'

async function setupClient() {
	const client = new Client({
		name: 'EpicMeTester',
		version: '1.0.0',
	})
	const transport = new StdioClientTransport({
		command: 'tsx',
		args: ['src/index.ts'],
	})

	try {
		await client.connect(transport)
	} catch (error: any) {
		console.error(
			'🚨 Connection failed! This exercise requires implementing the main function in src/index.ts',
		)
		console.error(
			'🚨 Replace the "throw new Error(\'Not implemented\')" with the actual MCP server setup',
		)
		console.error(
			'🚨 You need to: 1) Create an EpicMeMCP instance, 2) Initialize it, 3) Connect to stdio transport',
		)
		console.error('Original error:', error.message || error)
		throw error
	}

	return {
		client,
		async [Symbol.asyncDispose]() {
			await client.transport?.close()
		},
	}
}

test('Ping', async () => {
	await using setup = await setupClient()
	const { client } = setup
	try {
		const result = await client.ping()
		expect(result).toEqual({})
	} catch (error: any) {
		if (error.message?.includes('Connection closed') || error.code === -32000) {
			console.error('🚨 Ping failed because the MCP server crashed!')
			console.error(
				'🚨 This means the main() function in src/index.ts is not properly implemented',
			)
			console.error(
				'🚨 Check that you\'ve replaced the "Not implemented" error with actual server setup code',
			)
			const enhancedError = new Error(
				'🚨 MCP server implementation required in main() function. ' +
					(error.message || error),
			)
			enhancedError.stack = error.stack
			throw enhancedError
		}
		throw error
	}
})
