import { invariant } from '@epic-web/invariant'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { type DB } from './db'
import { getErrorMessage } from './utils.ts'

const createEntryInputSchema = {
	title: z.string().describe('The title of the entry'),
	content: z.string().describe('The content of the entry'),
	mood: z
		.string()
		.optional()
		.describe(
			'The mood of the entry (for example: "happy", "sad", "anxious", "excited")',
		),
	location: z
		.string()
		.optional()
		.describe(
			'The location of the entry (for example: "home", "work", "school", "park")',
		),
	weather: z
		.string()
		.optional()
		.describe(
			'The weather of the entry (for example: "sunny", "cloudy", "rainy", "snowy")',
		),
	isPrivate: z
		.number()
		.optional()
		.default(1)
		.describe('Whether the entry is private (1 for private, 0 for public)'),
	isFavorite: z
		.number()
		.optional()
		.default(0)
		.describe(
			'Whether the entry is a favorite (1 for favorite, 0 for not favorite)',
		),
}

const createTagInputSchema = {
	name: z.string().describe('The name of the tag'),
	description: z.string().optional().describe('The description of the tag'),
}

export function initializeTools(server: McpServer, db: DB) {
	// Entry Tools
	server.tool(
		'create_entry',
		'Create a new journal entry',
		createEntryInputSchema,
		async (entry) => {
			try {
				const createdEntry = await db.createEntry(entry)
				return {
					content: [
						{
							type: 'text',
							text: `Entry "${createdEntry.title}" created successfully with ID "${createdEntry.id}"`,
						},
					],
				}
			} catch (error) {
				console.error('Failed to create entry:', error)
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: `Failed to create entry: ${getErrorMessage(error)}`,
						},
					],
				}
			}
		},
	)

	server.tool(
		'get_entry',
		'Get a journal entry by ID',
		{
			id: z.number().describe('The ID of the entry'),
		},
		async ({ id }) => {
			try {
				const entry = await db.getEntry(id)
				invariant(entry, `Entry with ID "${id}" not found`)
				return {
					content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }],
				}
			} catch (error) {
				console.error('Failed to get entry:', error)
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: `Failed to get entry: ${getErrorMessage(error)}`,
						},
					],
				}
			}
		},
	)

	server.tool('list_entries', 'List all journal entries', async () => {
		try {
			const entries = await db.listEntries()
			return {
				content: [{ type: 'text', text: JSON.stringify(entries, null, 2) }],
			}
		} catch (error) {
			console.error('Failed to list entries:', error)
			return {
				isError: true,
				content: [{ type: 'text', text: 'Failed to list entries' }],
			}
		}
	})

	server.tool(
		'update_entry',
		'Update a journal entry',
		{
			id: z.number(),
			...createEntryInputSchema,
			title: z
				.string()
				.nullable()
				.optional()
				.describe('The title of the entry')
				.transform((value) => value ?? undefined),
			content: z
				.string()
				.nullable()
				.optional()
				.describe('The content of the entry')
				.transform((value) => value ?? undefined),
		},
		async ({ id, ...updates }) => {
			try {
				const existingEntry = await db.getEntry(id)
				invariant(existingEntry, `Entry with ID "${id}" not found`)
				const updatedEntry = await db.updateEntry(id, updates)
				return {
					content: [
						{
							type: 'text',
							text: `Entry "${updatedEntry.title}" (ID: ${id}) updated successfully`,
						},
					],
				}
			} catch (error) {
				console.error('Failed to update entry:', error)
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: `Failed to update entry: ${getErrorMessage(error)}`,
						},
					],
				}
			}
		},
	)

	server.tool(
		'delete_entry',
		'Delete a journal entry',
		{
			id: z.number().describe('The ID of the entry'),
		},
		async ({ id }) => {
			try {
				const existingEntry = await db.getEntry(id)
				invariant(existingEntry, `Entry with ID "${id}" not found`)
				await db.deleteEntry(id)
				return {
					content: [
						{
							type: 'text',
							text: `Entry "${existingEntry.title}" (ID: ${id}) deleted successfully`,
						},
					],
				}
			} catch (error) {
				console.error('Failed to delete entry:', error)
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: `Failed to delete entry: ${getErrorMessage(error)}`,
						},
					],
				}
			}
		},
	)

	// Tag Tools
	server.tool(
		'create_tag',
		'Create a new tag',
		createTagInputSchema,
		async (tag) => {
			try {
				const createdTag = await db.createTag(tag)
				return {
					content: [
						{
							type: 'text',
							text: `Tag "${createdTag.name}" created successfully with ID "${createdTag.id}"`,
						},
					],
				}
			} catch (error) {
				console.error('Failed to create tag:', error)
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: `Failed to create tag: ${getErrorMessage(error)}`,
						},
					],
				}
			}
		},
	)

	server.tool(
		'get_tag',
		'Get a tag by ID',
		{
			id: z.number().describe('The ID of the tag'),
		},
		async ({ id }) => {
			try {
				const tag = await db.getTag(id)
				invariant(tag, `Tag ID "${id}" not found`)
				return {
					content: [{ type: 'text', text: JSON.stringify(tag, null, 2) }],
				}
			} catch (error) {
				console.error('Failed to get tag:', error)
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: `Failed to get tag: ${getErrorMessage(error)}`,
						},
					],
				}
			}
		},
	)

	server.tool('list_tags', 'List all tags', async () => {
		try {
			const tags = await db.listTags()
			return {
				content: [{ type: 'text', text: JSON.stringify(tags, null, 2) }],
			}
		} catch (error) {
			console.error('Failed to list tags:', error)
			return {
				isError: true,
				content: [{ type: 'text', text: 'Failed to list tags' }],
			}
		}
	})

	server.tool(
		'update_tag',
		'Update a tag',
		{
			id: z.number(),
			...Object.fromEntries(
				Object.entries(createTagInputSchema).map(([key, value]) => [
					key,
					value.optional(),
				]),
			),
		},
		async ({ id, ...updates }) => {
			try {
				const existingTag = await db.getTag(id)
				invariant(existingTag, `Tag with ID "${id}" not found`)
				const updatedTag = await db.updateTag(id, updates)
				return {
					content: [
						{
							type: 'text',
							text: `Tag "${updatedTag.name}" (ID: ${id}) updated successfully`,
						},
					],
				}
			} catch (error) {
				console.error('Failed to update tag:', error)
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: `Failed to update tag: ${getErrorMessage(error)}`,
						},
					],
				}
			}
		},
	)

	server.tool(
		'delete_tag',
		'Delete a tag',
		{
			id: z.number().describe('The ID of the tag'),
		},
		async ({ id }) => {
			try {
				const existingTag = await db.getTag(id)
				invariant(existingTag, `Tag ID "${id}" not found`)
				await db.deleteTag(id)
				return {
					content: [
						{
							type: 'text',
							text: `Tag "${existingTag.name}" (ID: ${id}) deleted successfully`,
						},
					],
				}
			} catch (error) {
				console.error('Failed to delete tag:', error)
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: `Failed to delete tag: ${getErrorMessage(error)}`,
						},
					],
				}
			}
		},
	)

	// Entry Tag Tools
	server.tool(
		'add_tag_to_entry',
		'Add a tag to an entry',
		{
			entryId: z.number().describe('The ID of the entry'),
			tagId: z.number().describe('The ID of the tag'),
		},
		async ({ entryId, tagId }) => {
			try {
				const tag = await db.getTag(tagId)
				const entry = await db.getEntry(entryId)
				invariant(tag, `Tag ${tagId} not found`)
				invariant(entry, `Entry with ID "${entryId}" not found`)
				const entryTag = await db.addTagToEntry({ entryId, tagId })
				return {
					content: [
						{
							type: 'text',
							text: `Tag "${tag.name}" (ID: ${entryTag.tagId}) added to entry "${entry.title}" (ID: ${entryTag.entryId}) successfully`,
						},
					],
				}
			} catch (error) {
				console.error('Failed to add tag to entry:', error)
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: `Failed to add tag to entry: ${getErrorMessage(error)}`,
						},
					],
				}
			}
		},
	)

	server.tool(
		'get_entry_tags',
		'Get all tags for an entry',
		{
			entryId: z.number().describe('The ID of the entry'),
		},
		async ({ entryId }) => {
			try {
				const entry = await db.getEntry(entryId)
				invariant(entry, `Entry with ID "${entryId}" not found`)
				const tags = await db.getEntryTags(entryId)
				return {
					content: [
						{
							type: 'text',
							text: `Tags for entry "${entry.title}" (ID: ${entryId}): ${JSON.stringify(tags, null, 2)}`,
						},
					],
				}
			} catch (error) {
				console.error('Failed to get entry tags:', error)
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: `Failed to get entry tags: ${getErrorMessage(error)}`,
						},
					],
				}
			}
		},
	)
}
