import { z } from 'zod'
import { type EpicMeMCP } from './index.ts'
// 🧝‍♀️ I made this utility for you to get the error message from an error
// import { getErrorMessage } from './utils.ts'

export async function initializeTools(agent: EpicMeMCP) {
	agent.server.tool(
		'create_tag',
		'Create a new tag',
		{
			name: z.string().describe('The name of the tag'),
			description: z.string().optional().describe('The description of the tag'),
		},
		async (tag) => {
			// 🐨 wrap this in a try catch
			const createdTag = await agent.db.createTag(tag)
			return {
				content: [
					{
						type: 'text',
						text: `Tag "${createdTag.name}" created successfully with ID "${createdTag.id}"`,
					},
				],
			}
			// 🐨 in the catch, return content with the error message as the text
			// and also set isError to true
		},
	)
}
