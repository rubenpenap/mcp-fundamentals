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
Please look up my EpicMe journal entry with ID "${entryId}" using get_entry and look up the tags I have available using list_tags.

Then suggest some tags to add to it. Feel free to suggest new tags I don't have yet.

For each tag I approve, if it does not yet exist, create it with the EpicMe "create_tag" tool. Then add approved tags to the entry with the EpicMe "add_tag_to_entry" tool.
								`.trim(),
						},
					},
				],
			}
		},
	)
}
