import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { DB } from './db/index.ts'
// 🐨 Make tools.ts and you'll export a function called initializeTools:
// import { initializeTools } from './tools.ts'

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

// 🐨 move this tool to a function called `initializeTools` in a separate file ./tools.ts
server.tool(
	'create_tag',
	'Create a new tag',
	{
		name: z.string().describe('The name of the tag'),
		description: z.string().optional().describe('The description of the tag'),
	},
	async (tag) => {
		const createdTag = await db.createTag(tag)
		return {
			content: [
				{
					type: 'text',
					text: `Tag "${createdTag.name}" created successfully with ID "${createdTag.id}"`,
				},
			],
		}
	},
)
// 🐨 call initializeTools with the server and db

async function main() {
	const transport = new StdioServerTransport()
	await server.connect(transport)
	console.error('EpicMe MCP Server running on stdio')
}

main().catch((error) => {
	console.error('Fatal error in main():', error)
	process.exit(1)
})
