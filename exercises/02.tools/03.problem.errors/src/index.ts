import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer(
	{
		name: 'epicme',
		title: 'EpicMe',
		version: '1.0.0',
	},
	{
		capabilities: {
			tools: {},
		},
		instructions: 'This lets you solve math problems.',
	},
)

server.registerTool(
	'add',
	{
		title: 'Add',
		description: 'Add two numbers',
		inputSchema: {
			firstNumber: z.number().describe('The first number to add'),
			secondNumber: z.number().describe('The second number to add'),
		},
	},
	async ({ firstNumber, secondNumber }) => {
		// 🐨 throw an error if the second number is negative
		// 💯 as a bonus, you can use the invariant function from @epic-web/invariant
		return {
			content: [
				{
					type: 'text',
					text: `The sum of ${firstNumber} and ${secondNumber} is ${firstNumber + secondNumber}.`,
				},
			],
		}
	},
)

async function main() {
	const transport = new StdioServerTransport()
	await server.connect(transport)
	console.error('EpicMe MCP Server running on stdio')
}

main().catch((error) => {
	console.error('Fatal error in main():', error)
	process.exit(1)
})
