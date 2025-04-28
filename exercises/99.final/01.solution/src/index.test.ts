import { invariant } from '@epic-web/invariant'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { test, beforeAll, afterAll, expect } from 'vitest'

let client: Client

async function connect() {
	client = new Client({
		name: 'EpicMeMCP',
		version: '1.0.0',
	})
	const MCP_URL = process.env.MCP_BASE_URL
	invariant(
		MCP_URL,
		'MCP_BASE_URL is not set (should be set automatically by global-setup)',
	)
	const mcpEndpoint = new URL('/mcp', MCP_URL)
	const transport = new StreamableHTTPClientTransport(mcpEndpoint)
	await client.connect(transport)
}

beforeAll(async () => {
	await connect()
})

afterAll(async () => {
	await client.transport?.close()
})

test('Tool Definition', async () => {
	const list = await client.listTools()
	const [firstTool] = list.tools
	invariant(firstTool, '🚨 No tools found')

	expect(firstTool).toEqual(
		expect.objectContaining({
			name: expect.stringMatching(/^create_entry$/i),
			description: expect.stringMatching(/^create a new journal entry$/i),
			inputSchema: expect.objectContaining({
				type: 'object',
				properties: expect.objectContaining({
					title: expect.objectContaining({
						type: 'string',
						description: expect.stringMatching(/title/i),
					}),
					content: expect.objectContaining({
						type: 'string',
						description: expect.stringMatching(/content/i),
					}),
				}),
			}),
		}),
	)
})

test('Tool Call', async () => {
	const result = await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Test Entry',
			content: 'This is a test entry',
		},
	})

	expect(result).toEqual(
		expect.objectContaining({
			content: expect.arrayContaining([
				expect.objectContaining({
					type: 'text',
					text: expect.stringMatching(
						/Entry "Test Entry" created successfully/,
					),
				}),
			]),
		}),
	)
})
