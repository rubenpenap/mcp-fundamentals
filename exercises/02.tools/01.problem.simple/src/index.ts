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
// - the name should be 'add'
// - the description should explain what it can be used to do (add one and two)
// - the callback should return a standard text response that says "one and two equals three"

async function main() {
	const transport = new StdioServerTransport()
	await server.connect(transport)
	console.error('EpicMe MCP Server running on stdio')
}

main().catch((error) => {
	console.error('Fatal error in main():', error)
	process.exit(1)
})
