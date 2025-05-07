import { type GetPromptResult } from '@modelcontextprotocol/sdk/types.js'
import { type DB } from './db/index.ts'
import { type EpicMeMCP } from './index.ts'
import { getErrorMessage, formatDate, timeAgo } from './utils.ts'

export async function initializePrompts(agent: EpicMeMCP) {
	agent.server.prompt(
		'summarize-journal-entries',
		'Summarize your past journal entries',
		async () => {
			try {
				const entries = await agent.db.getEntriesWithTags()
				if (entries.length === 0) {
					return {
						messages: [
							{
								role: 'assistant',
								content: {
									type: 'text',
									text: 'You have no journal entries yet. Would you like to create one?',
								},
							},
						],
					} satisfies GetPromptResult
				}

				const formattedEntries = entries
					.map((entry) => getFormattedEntry(entry))
					.join('\n\n')

				return {
					messages: [
						{
							role: 'user',
							content: {
								type: 'text',
								text: `Here are my journal entries:\n\n${formattedEntries}\n\nCan you please summarize them for me?`,
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
		'---',
		`# ${entry.title}`,
		'',
		entry.content,
		'',
		`Mood: ${entry.mood ?? 'N/A'}`,
		`Weather: ${entry.weather ?? 'N/A'}`,
		`Location: ${entry.location ?? 'N/A'}`,
		`Is Private: ${entry.isPrivate}`,
		`Is Favorite: ${entry.isFavorite}`,
		`Created At: ${createdAtDate} (${createdAtAgo})`,
		`Updated At: ${updatedAtDate} (${updatedAtAgo})`,
		`Tags: ${tagList}`,
		'---',
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
