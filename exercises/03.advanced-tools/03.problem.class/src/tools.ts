import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { type DB } from './db/index.ts'

// 🐨 Instead of server and db, accept an instance of EpicMeMCP called "agent"
export async function initializeTools(server: McpServer, db: DB) {
	// 🐨 update this to reference the server from agent.server
	server.tool(
		'create_tag',
		'Create a new tag',
		{
			name: z.string().describe('The name of the tag'),
			description: z.string().optional().describe('The description of the tag'),
		},
		async (tag) => {
			// 🐨 update this to reference the db from agent.db
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
}
