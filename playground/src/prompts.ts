import { z } from 'zod'
import { type EpicMeMCP } from './index.ts'

export async function initializePrompts(agent: EpicMeMCP) {
	agent.server.registerPrompt(
		'suggest_tags',
		{
			title: 'Suggest Tags',
			description: 'Suggest tags for a journal entry',
			argsSchema: {
				entryId: z
					.string()
					.describe('The ID of the journal entry to suggest tags for'),
			},
		},
		async ({ entryId }) => {
			return {
				messages: [
					{
						role: 'user',
						content: {
							type: 'text',
							text: `
Please look up the journal entry with the given ID "${entryId}" (tell it to use the get_entry tool) and look up the available tags (tell it to use the list_tags tool).
Then suggest tags (creating new ones if necessary) and for approved tags, tell it to create new ones (tell it to use the create_tag tool) and then add them to the entry (tell it to use the add_tag_to_entry tool).
								`.trim(),
						},
					},
				],
			}
		},
	)
}
