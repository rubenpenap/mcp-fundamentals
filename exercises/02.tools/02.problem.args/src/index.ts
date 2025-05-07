import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const server = new McpServer(
	{
		name: 'EpicMe',
		version: '1.0.0',
	},
	{
		capabilities: {
			tools: {},
		},
		instructions: 'This lets you solve math problems.',
	},
)

server.tool(
	'add',
	// 🐨 update the description to indicate this adds any two numbers
	'Add one and two',
	// 🐨 add an object with a firstNumber and secondNumber property
	// 📜 These should be zod schemas https://zod.dev/
	async () => {
		// 🐨 accept an object parameter with a firstNumber and secondNumber property
		return {
			content: [
				{
					type: 'text',
					// 🐨 use the firstNumber and secondNumber properties to return the sum
					text: `The sum of 1 and 2 is 3.`,
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
