import { z } from 'zod'
import { type EpicMeMCP } from './index.ts'
import { getErrorMessage } from './utils.ts'

export async function initializeTools(agent: EpicMeMCP) {
	agent.server.tool(
		'create_tag',
		'Create a new tag',
		{
			name: z.string().describe('The name of the tag'),
			description: z.string().optional().describe('The description of the tag'),
		},
		async (tag) => {
			try {
				const createdTag = await agent.db.createTag(tag)
				return {
					content: [
						{
							type: 'text',
							text: `Tag "${createdTag.name}" created successfully with ID "${createdTag.id}"`,
						},
					],
				}
			} catch (error) {
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: getErrorMessage(error),
						},
					],
				}
			}
		},
	)
}
