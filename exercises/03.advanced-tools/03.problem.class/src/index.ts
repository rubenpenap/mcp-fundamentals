import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { DB } from './db/index.ts'
import { initializeTools } from './tools.ts'

// 🐨 make a class called EpicMeMCP. It should have a db and server property
// 🐨 the server can be initialized in the constructor
// 🐨 the db (DB.getInstance) can be created in the constructor
// 🐨 create an async init method that initializes the database and tools
// 🦉 the reason we have this separate from the constructor is because it's async
//    and constructor can't be async

// 💣 we're going to move this to the constructor of our EpicMeMCP class
const db = DB.getInstance('./db.sqlite')

const server = new McpServer(
	{
		name: 'EpicMe',
		version: '1.0.0',
	},
	{
		capabilities: {
			tools: {},
		},
		instructions: `
EpicMe is a journaling app that allows users to write about and review their experiences, thoughts, and reflections.

These tools are the user's window into their journal. With these tools and your help, they can create, read, and manage their journal entries and associated tags.

You can also help users add tags to their entries and get all tags for an entry.
		`.trim(),
	},
)

// 🐨 put this in the new init method. Pass "this" instead
await initializeTools(server, db)

async function main() {
	// 🐨 create a new instance of EpicMeMCP called "agent"
	// 🐨 call the init method
	const transport = new StdioServerTransport()
	// 🐨 reference the server from the agent instance with agent.server
	await server.connect(transport)
	console.error('EpicMe MCP Server running on stdio')
}

main().catch((error) => {
	console.error('Fatal error in main():', error)
	process.exit(1)
})
