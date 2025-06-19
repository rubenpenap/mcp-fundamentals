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
			// 🐨 get the entry and tags from the database
			// 💰 const entry = await agent.db.getEntry(Number(entryId))
			// 💰 const tags = await agent.db.listTags()
			// 💯 As extra credit, add some validation to make sure the entryId is a
			// valid number and the entry exists (you can use the invariant function
			// from @epic-web/invariant)

			return {
				messages: [
					{
						role: 'user',
						content: {
							type: 'text',
							// 🐨 update the text to explain the entry and tags will be provided.
							text: `
Please look up my EpicMe journal entry with ID "${entryId}" using get_entry and look up the tags I have available using list_tags.

Then suggest some tags to add to it. Feel free to suggest new tags I don't have yet.

For each tag I approve, if it does not yet exist, create it with the EpicMe "create_tag" tool. Then add approved tags to the entry with the EpicMe "add_tag_to_entry" tool.
								`.trim(),
						},
					},
					// 🐨 add two messages from the user which are embedded resources, one
					// for the entry and one for the existing tags.
				],
			}
		},
	)
}
