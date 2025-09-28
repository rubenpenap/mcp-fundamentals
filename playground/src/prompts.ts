import { invariant } from '@epic-web/invariant'
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
			invariant(entryId, 'entryId is required')
			invariant(
				!Number.isNaN(Number(entryId)),
				'entryId must be a valid number',
			)
			const entry = await agent.db.getEntry(Number(entryId))
			invariant(entry, `entry with the ID "${entryId}" not found`)
			const tags = await agent.db.listTags()

			return {
				messages: [
					{
						role: 'user',
						content: {
							type: 'text',
							text: `
Below is my EpicMe journal entry with ID "${entryId}" and the tags I have available.

Then suggest some tags to add to it. Feel free to suggest new tags I don't have yet.

For each tag I approve, if it does not yet exist, create it with the EpicMe "create_tag" tool. Then add approved tags to the entry with the EpicMe "add_tag_to_entry" tool.
								`.trim(),
						},
					},
					{
						role: 'user',
						content: {
							type: 'resource',
							resource: {
								uri: 'epicme://tags',
								mimeType: 'application/json',
								text: JSON.stringify(tags),
							},
						},
					},
					{
						role: 'user',
						content: {
							type: 'resource',
							resource: {
								uri: `epicme://entries/${entryId}`,
								mimeType: 'application/json',
								text: JSON.stringify(entry),
							},
						},
					},
				],
			}
		},
	)
}
