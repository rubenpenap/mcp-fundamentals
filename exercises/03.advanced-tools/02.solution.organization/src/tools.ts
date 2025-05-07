import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { type DB } from './db/index.ts'

export async function initializeTools(server: McpServer, db: DB) {
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
}
