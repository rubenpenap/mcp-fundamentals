import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

const server = new McpServer(
	{
		name: 'EpicMath',
		version: '1.0.0',
	},
	{
		capabilities: {
			tools: {},
		},
		instructions: 'This lets you solve math problems.',
	},
)

const computations = new Map<string, number>()

server.tool(
	'add',
	'Add two numbers',
	{
		firstNumber: z.number().describe('The first number to add'),
		secondNumber: z.number().describe('The second number to add'),
	},
	async ({ firstNumber, secondNumber }) => {
		const key = `${firstNumber}+${secondNumber}`
		computations.set(key, firstNumber + secondNumber)
		const result = computations.get(key)
		server.sendResourceListChanged()
		return {
			content: [
				{
					type: 'text',
					text: `The sum of ${firstNumber} and ${secondNumber} is ${result}.`,
				},
			],
		}
	},
)

server.resource(
	'computation',
	'computations://all',
	{
		description: 'A list of all computations which have been made',
		mimeType: 'text/plain',
	},
	(uri) => {
		return {
			contents: [
				{
					text: Array.from(computations.entries())
						.map(([key, result]) => `${key}=${result}`)
						.join('\n'),
					mimeType: 'text/plain',
					uri: uri.toString(),
				},
			],
		}
	},
)

async function main() {
	const transport = new StdioServerTransport()
	await server.connect(transport)
	console.error('EpicMath MCP Server running on stdio')
}

main().catch((error) => {
	console.error('Fatal error in main():', error)
	process.exit(1)
})
