import { z } from 'zod'

// Helper to transform timestamps from SQLite's datetime format
const timestampSchema = z.preprocess((val) => {
	if (typeof val === 'string') {
		// SQLite datetime format: YYYY-MM-DD HH:MM:SS
		const date = new Date(val.replace(' ', 'T'))
		const timestamp = date.getTime() / 1000
		return isNaN(timestamp) ? null : timestamp
	}
	return val
}, z.number())

export const entrySchema = z.object({
	id: z.coerce.number(),
	title: z.string(),
	content: z.string(),
	mood: z.string().nullable(),
	location: z.string().nullable(),
	weather: z.string().nullable(),
	isPrivate: z.coerce.number(),
	isFavorite: z.coerce.number(),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
})

export const entryWithTagsSchema = entrySchema.extend({
	tags: z.array(z.object({ id: z.number(), name: z.string() })),
})

export const newEntrySchema = z.object({
	title: z.string(),
	content: z.string(),
	mood: z.string().optional().nullable().default(null),
	location: z.string().optional().nullable().default(null),
	weather: z.string().optional().nullable().default(null),
	isPrivate: z.number().optional().default(1),
	isFavorite: z.number().optional().default(0),
})

export const tagSchema = z.object({
	id: z.coerce.number(),
	name: z.string(),
	description: z.string().nullable(),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
})

export const newTagSchema = z.object({
	name: z.string(),
	description: z.string().nullable().optional(),
})

export const entryTagSchema = z.object({
	id: z.coerce.number(),
	entryId: z.coerce.number(),
	tagId: z.coerce.number(),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
})

export const entryIdSchema = { id: z.number().describe('The ID of the entry') }
export const tagIdSchema = { id: z.number().describe('The ID of the tag') }
export const entryTagIdSchema = {
	entryId: z.number().describe('The ID of the entry'),
	tagId: z.number().describe('The ID of the tag'),
}

export const createEntryInputSchema = {
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
	tags: z
		.array(z.number())
		.optional()
		.describe('The IDs of the tags to add to the entry'),
}

export const updateEntryInputSchema = {
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
}

export const createTagInputSchema = {
	name: z.string().describe('The name of the tag'),
	description: z.string().optional().describe('The description of the tag'),
}

export const updateTagInputSchema = {
	id: z.number(),
	...Object.fromEntries(
		Object.entries(createTagInputSchema).map(([key, value]) => [
			key,
			value.nullable().optional(),
		]),
	),
}

export type Entry = z.infer<typeof entrySchema>
export type NewEntry = z.infer<typeof newEntrySchema>
export type Tag = z.infer<typeof tagSchema>
export type NewTag = z.infer<typeof newTagSchema>
export type EntryTag = z.infer<typeof entryTagSchema>
export type EntryWithTags = z.infer<typeof entryWithTagsSchema>
