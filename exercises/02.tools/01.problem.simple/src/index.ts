import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const server = new McpServer(
	{
		name: 'EpicMe',
		version: '1.0.0',
	},
	{
		// 🐨 add a capabilities object with a tools property that is an empty object
		instructions: 'This lets you solve math problems.',
	},
)

// 🐨 add a tool to the server with the server.tool API
// - it should be named 'add'
// - it should have a description explaining what it can be used to do
// - provide an input schema object with two properties which are validated with zod (give them descriptions as well):
//   - firstNumber: a number
//   - secondNumber: a number
// - it should return a standard text response with the sum of the two numbers

async function main() {
	const transport = new StdioServerTransport()
	await server.connect(transport)
	console.error('EpicMe MCP Server running on stdio')
}

main().catch((error) => {
	console.error('Fatal error in main():', error)
	process.exit(1)
})
