import { invariant } from '@epic-web/invariant'
import { type GetPromptResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { type DB } from './db/index.ts'
import { type EpicMeMCP } from './index.ts'
import { getErrorMessage, formatDate, timeAgo } from './utils.ts'

export async function initializePrompts(agent: EpicMeMCP) {
	agent.server.prompt(
		'suggest-tags',
		'Suggest tags for a journal entry',
		{
			entryId: z
				.string()
				.describe('The ID of the journal entry to suggest tags for'),
		},
		async ({ entryId }) => {
			try {
				const entry = await agent.db.getEntry(Number(entryId))
				invariant(entry, `Entry with ID "${entryId}" not found`)

				const unusedTags = await getUnusedTags(agent.db, entry)
				const formattedEntry = getFormattedEntry(entry)

				return {
					messages: [
						{
							role: 'user',
							content: {
								type: 'text',
								text: [
									`Here is my journal entry (ID: ${entryId}):`,
									'',
									'---',
									formattedEntry,
									'---',
									'',
									unusedTags.length
										? `Here are other tags I have available:`
										: `I do not have any other tags available.`,
									`${unusedTags.map((tag) => `${tag.name}: ${tag.description} (${tag.id})`).join('\n')}`,
									'',
									`Can you please suggest some tags to add to my entry? For those that I approve, if it does not yet exist, create it with the EpicMe "create_tag". Then add it with the EpicMe "add_tag_to_entry" tool.`,
								].join('\n'),
							},
						},
					],
				} satisfies GetPromptResult
			} catch (error) {
				return createErrorReply(error)
			}
		},
	)
}

async function getUnusedTags(
	db: DB,
	entry: Awaited<ReturnType<DB['getEntriesWithTags']>>[number],
) {
	const tags = await db.listTags()
	const unusedTagIds = tags
		.filter((tag) => !entry.tags.includes(tag))
		.map((t) => t.id)
	const unusedTags: Array<NonNullable<Awaited<ReturnType<DB['getTag']>>>> = []
	for (const tagId of unusedTagIds) {
		const tag = await db.getTag(tagId)
		if (tag) unusedTags.push(tag)
	}
	return unusedTags
}

function getFormattedEntry(
	entry: Awaited<ReturnType<DB['getEntriesWithTags']>>[number],
) {
	const tagList =
		entry.tags && entry.tags.length > 0
			? entry.tags.map((tag) => tag.name).join(', ')
			: 'None'
	const createdAtDate = formatDate(entry.createdAt)
	const updatedAtDate = formatDate(entry.updatedAt)
	const createdAtAgo = timeAgo(entry.createdAt)
	const updatedAtAgo = timeAgo(entry.updatedAt)
	return [
		`# ${entry.title}`,
		'',
		entry.content,
		'',
		`Mood: ${entry.mood ?? 'N/A'}`,
		`Weather: ${entry.weather ?? 'N/A'}`,
		`Location: ${entry.location ?? 'N/A'}`,
		`Is Private: ${entry.isPrivate ? 'Yes' : 'No'}`,
		`Is Favorite: ${entry.isFavorite ? 'Yes' : 'No'}`,
		`Created At: ${createdAtDate} (${createdAtAgo})`,
		`Updated At: ${updatedAtDate} (${updatedAtAgo})`,
		`Tags: ${tagList}`,
	].join('\n')
}

function createErrorReply(error: unknown): GetPromptResult {
	console.error(`Failed running prompt:\n`, error)
	return {
		isError: true,
		messages: [
			{
				role: 'assistant',
				content: {
					type: 'text',
					text: getErrorMessage(error),
				},
			},
		],
	}
}
