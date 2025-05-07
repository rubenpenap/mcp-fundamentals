import { invariant } from '@epic-web/invariant'
import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { createEntryInputSchema, createTagInputSchema } from './db/schema.ts'
import { type EpicMeMCP } from './index.ts'
import { getErrorMessage } from './utils.ts'

export async function initializeTools(agent: EpicMeMCP) {
	// Entry Tools
	agent.server.tool(
		'create_entry',
		'Create a new journal entry',
		createEntryInputSchema,
		async (entry) => {
			try {
				const createdEntry = await agent.db.createEntry(entry)
				if (entry.tags) {
					for (const tagId of entry.tags) {
						await agent.db.addTagToEntry({
							entryId: createdEntry.id,
							tagId,
						})
					}
				}
				return createReply(
					`Entry "${createdEntry.title}" created successfully with ID "${createdEntry.id}"`,
				)
			} catch (error) {
				return createErrorReply(error)
			}
		},
	)

	agent.server.tool(
		'get_entry',
		'Get a journal entry by ID',
		{
			id: z.number().describe('The ID of the entry'),
		},
		async ({ id }) => {
			try {
				const entry = await agent.db.getEntry(id)
				invariant(entry, `Entry with ID "${id}" not found`)
				return createReply(entry)
			} catch (error) {
				return createErrorReply(error)
			}
		},
	)

	agent.server.tool(
		'list_entries',
		'List all journal entries',
		{
			tagIds: z
				.array(z.number())
				.optional()
				.describe('Optional array of tag IDs to filter entries by'),
		},
		async ({ tagIds }) => {
			try {
				const entries = await agent.db.listEntries(tagIds)
				return createReply(entries)
			} catch (error) {
				return createErrorReply(error)
			}
		},
	)

	agent.server.tool(
		'update_entry',
		'Update a journal entry. Fields that are not provided (or set to undefined) will not be updated. Fields that are set to null or any other value will be updated.',
		{
			id: z.number(),
			title: z.string().optional().describe('The title of the entry'),
			content: z.string().optional().describe('The content of the entry'),
			mood: z
				.string()
				.nullable()
				.optional()
				.describe(
					'The mood of the entry (for example: "happy", "sad", "anxious", "excited")',
				),
			location: z
				.string()
				.nullable()
				.optional()
				.describe(
					'The location of the entry (for example: "home", "work", "school", "park")',
				),
			weather: z
				.string()
				.nullable()
				.optional()
				.describe(
					'The weather of the entry (for example: "sunny", "cloudy", "rainy", "snowy")',
				),
			isPrivate: z
				.number()
				.optional()
				.describe('Whether the entry is private (1 for private, 0 for public)'),
			isFavorite: z
				.number()
				.optional()
				.describe(
					'Whether the entry is a favorite (1 for favorite, 0 for not favorite)',
				),
		},
		async ({ id, ...updates }) => {
			try {
				const existingEntry = await agent.db.getEntry(id)
				invariant(existingEntry, `Entry with ID "${id}" not found`)
				const updatedEntry = await agent.db.updateEntry(id, updates)
				return createReply(
					`Entry "${updatedEntry.title}" (ID: ${id}) updated successfully`,
				)
			} catch (error) {
				return createErrorReply(error)
			}
		},
	)

	agent.server.tool(
		'delete_entry',
		'Delete a journal entry',
		{
			id: z.number().describe('The ID of the entry'),
		},
		async ({ id }) => {
			try {
				const existingEntry = await agent.db.getEntry(id)
				invariant(existingEntry, `Entry with ID "${id}" not found`)
				await agent.db.deleteEntry(id)
				return createReply(
					`Entry "${existingEntry.title}" (ID: ${id}) deleted successfully`,
				)
			} catch (error) {
				return createErrorReply(error)
			}
		},
	)

	// Tag Tools
	agent.server.tool(
		'create_tag',
		'Create a new tag',
		createTagInputSchema,
		async (tag) => {
			try {
				const createdTag = await agent.db.createTag(tag)
				return createReply(
					`Tag "${createdTag.name}" created successfully with ID "${createdTag.id}"`,
				)
			} catch (error) {
				return createErrorReply(error)
			}
		},
	)

	agent.server.tool(
		'get_tag',
		'Get a tag by ID',
		{
			id: z.number().describe('The ID of the tag'),
		},
		async ({ id }) => {
			try {
				const tag = await agent.db.getTag(id)
				invariant(tag, `Tag ID "${id}" not found`)
				return createReply(tag)
			} catch (error) {
				return createErrorReply(error)
			}
		},
	)

	agent.server.tool('list_tags', 'List all tags', async () => {
		try {
			const tags = await agent.db.listTags()
			return createReply(tags)
		} catch (error) {
			return createErrorReply(error)
		}
	})

	agent.server.tool(
		'update_tag',
		'Update a tag',
		{
			id: z.number(),
			...Object.fromEntries(
				Object.entries(createTagInputSchema).map(([key, value]) => [
					key,
					value.nullable().optional(),
				]),
			),
		},
		async ({ id, ...updates }) => {
			try {
				const updatedTag = await agent.db.updateTag(id, updates)
				return createReply(
					`Tag "${updatedTag.name}" (ID: ${id}) updated successfully`,
				)
			} catch (error) {
				return createErrorReply(error)
			}
		},
	)

	agent.server.tool(
		'delete_tag',
		'Delete a tag',
		{
			id: z.number().describe('The ID of the tag'),
		},
		async ({ id }) => {
			try {
				const existingTag = await agent.db.getTag(id)
				invariant(existingTag, `Tag ID "${id}" not found`)
				await agent.db.deleteTag(id)
				return createReply(
					`Tag "${existingTag.name}" (ID: ${id}) deleted successfully`,
				)
			} catch (error) {
				return createErrorReply(error)
			}
		},
	)

	// Entry Tag Tools
	agent.server.tool(
		'add_tag_to_entry',
		'Add a tag to an entry',
		{
			entryId: z.number().describe('The ID of the entry'),
			tagId: z.number().describe('The ID of the tag'),
		},
		async ({ entryId, tagId }) => {
			try {
				const tag = await agent.db.getTag(tagId)
				const entry = await agent.db.getEntry(entryId)
				invariant(tag, `Tag ${tagId} not found`)
				invariant(entry, `Entry with ID "${entryId}" not found`)
				const entryTag = await agent.db.addTagToEntry({
					entryId,
					tagId,
				})
				return createReply(
					`Tag "${tag.name}" (ID: ${entryTag.tagId}) added to entry "${entry.title}" (ID: ${entryTag.entryId}) successfully`,
				)
			} catch (error) {
				return createErrorReply(error)
			}
		},
	)
}

function createErrorReply(error: unknown): CallToolResult {
	console.error(`Failed running tool:\n`, error)
	return {
		isError: true,
		content: [{ type: 'text', text: getErrorMessage(error) }],
	}
}

function createReply(text: any): CallToolResult {
	if (typeof text === 'string') {
		return { content: [{ type: 'text', text }] }
	} else {
		return {
			content: [{ type: 'text', text: JSON.stringify(text, null, 2) }],
		}
	}
}
