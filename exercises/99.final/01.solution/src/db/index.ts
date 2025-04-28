/// <reference path="../../types/worker-configuration.d.ts" />

import { z } from 'zod'
import { type Env } from '../types.ts'
import { migrate } from './migrations.ts'
import {
	type Entry,
	type NewEntry,
	type Tag,
	type NewTag,
	type EntryTag,
	type NewEntryTag,
	entrySchema,
	newEntrySchema,
	tagSchema,
	newTagSchema,
	entryTagSchema,
	newEntryTagSchema,
} from './schema.ts'
import { sql, snakeToCamel } from './utils.ts'

export type { Entry, NewEntry, Tag, NewTag, EntryTag, NewEntryTag }

export class DB {
	#db: D1Database
	constructor(db: D1Database) {
		this.#db = db
	}

	static async getInstance(env: Env) {
		const db = new DB(env.EPIC_ME_DB)
		await migrate(env.EPIC_ME_DB)
		return db
	}

	// Entry Methods
	async createEntry(entry: z.input<typeof newEntrySchema>) {
		// Validate input
		const validatedEntry = newEntrySchema.parse(entry)

		const ps = this.#db.prepare(sql`
			INSERT INTO entries (
				title, content, mood, location, weather,
				is_private, is_favorite
			) VALUES (
				?1, ?2, ?3, ?4, ?5,
				?6, ?7
			)
		`)

		const insertResult = await ps
			.bind(
				validatedEntry.title,
				validatedEntry.content,
				validatedEntry.mood,
				validatedEntry.location,
				validatedEntry.weather,
				validatedEntry.isPrivate,
				validatedEntry.isFavorite,
			)
			.run()

		if (!insertResult.success || !insertResult.meta.last_row_id) {
			throw new Error('Failed to create entry: ' + insertResult.error)
		}

		// Fetch the created entry
		const createdEntry = await this.getEntry(insertResult.meta.last_row_id)
		if (!createdEntry) {
			throw new Error('Failed to query created entry')
		}

		return createdEntry
	}

	async getEntry(id: number) {
		const entryResult = await this.#db
			.prepare(sql`SELECT * FROM entries WHERE id = ?1`)
			.bind(id)
			.first()

		if (!entryResult) return null

		const entry = entrySchema.parse(snakeToCamel(entryResult))

		// Get tags for this entry
		const tagsResult = await this.#db
			.prepare(
				sql`
					SELECT t.id, t.name
					FROM tags t
					JOIN entry_tags et ON et.tag_id = t.id
					WHERE et.entry_id = ?1
					ORDER BY t.name
				`,
			)
			.bind(id)
			.all()

		const tags = z
			.array(
				z.object({
					id: z.number(),
					name: z.string(),
				}),
			)
			.parse(tagsResult.results.map((result) => snakeToCamel(result)))

		return {
			...entry,
			tags,
		}
	}

	async listEntries(tagIds?: Array<number>) {
		const queryParts = [
			sql`SELECT DISTINCT e.*, COUNT(et.id) as tag_count`,
			sql`FROM entries e`,
			sql`LEFT JOIN entry_tags et ON e.id = et.entry_id`,
		]
		const params: Array<number> = []

		if (tagIds && tagIds.length > 0) {
			queryParts.push(sql`AND EXISTS (
				SELECT 1 FROM entry_tags et2 
				WHERE et2.entry_id = e.id 
				AND et2.tag_id IN (${tagIds.map((_, i) => `?${i + 1}`).join(',')})
			)`)
			params.push(...tagIds)
		}

		queryParts.push(sql`GROUP BY e.id`, sql`ORDER BY e.created_at DESC`)

		const query = queryParts.join(' ')
		const results = await this.#db
			.prepare(query)
			.bind(...params)
			.all()

		return z
			.array(
				z.object({
					id: z.number(),
					title: z.string(),
					tagCount: z.number(),
				}),
			)
			.parse(
				results.results.map((result) => ({
					id: result.id,
					title: result.title,
					tagCount: result.tag_count,
				})),
			)
	}

	async updateEntry(
		id: number,
		entry: Partial<z.input<typeof newEntrySchema>>,
	) {
		const existingEntry = await this.getEntry(id)
		if (!existingEntry) {
			throw new Error(`Entry with ID ${id} not found`)
		}

		// Only include fields that are explicitly provided (even if null) but not undefined
		const updates = Object.entries(entry)
			.filter(([key, value]) => value !== undefined)
			.map(
				([key], index) =>
					`${key === 'isPrivate' ? 'is_private' : key === 'isFavorite' ? 'is_favorite' : key} = ?${index + 3}`,
			)
			.join(', ')

		if (!updates) {
			return existingEntry
		}

		const ps = this.#db.prepare(sql`
			UPDATE entries 
			SET ${updates}, updated_at = CURRENT_TIMESTAMP 
			WHERE id = ?1
		`)

		const updateValues = [
			id,
			...Object.entries(entry)
				.filter(([key, value]) => value !== undefined)
				.map(([, value]) => value),
		]

		const updateResult = await ps.bind(...updateValues).run()

		if (!updateResult.success) {
			throw new Error('Failed to update entry: ' + updateResult.error)
		}

		const updatedEntry = await this.getEntry(id)
		if (!updatedEntry) {
			throw new Error('Failed to query updated entry')
		}

		return updatedEntry
	}

	async deleteEntry(id: number) {
		const existingEntry = await this.getEntry(id)
		if (!existingEntry) {
			throw new Error(`Entry with ID ${id} not found`)
		}

		const deleteResult = await this.#db
			.prepare(sql`DELETE FROM entries WHERE id = ?1`)
			.bind(id)
			.run()

		if (!deleteResult.success) {
			throw new Error('Failed to delete entry: ' + deleteResult.error)
		}

		return true
	}

	// Tag Methods
	async createTag(tag: NewTag) {
		const validatedTag = newTagSchema.parse(tag)

		const ps = this.#db.prepare(sql`
			INSERT INTO tags (name, description)
			VALUES (?1, ?2)
		`)

		const insertResult = await ps
			.bind(validatedTag.name, validatedTag.description)
			.run()

		if (!insertResult.success || !insertResult.meta.last_row_id) {
			throw new Error('Failed to create tag: ' + insertResult.error)
		}

		const createdTag = await this.getTag(insertResult.meta.last_row_id)
		if (!createdTag) {
			throw new Error('Failed to query created tag')
		}

		return createdTag
	}

	async getTag(id: number) {
		const result = await this.#db
			.prepare(sql`SELECT * FROM tags WHERE id = ?1`)
			.bind(id)
			.first()

		if (!result) return null

		return tagSchema.parse(snakeToCamel(result))
	}

	async listTags() {
		const results = await this.#db
			.prepare(
				sql`
				SELECT id, name 
				FROM tags 
				ORDER BY name
			`,
			)
			.all()

		return z
			.array(
				z.object({
					id: z.number(),
					name: z.string(),
				}),
			)
			.parse(results.results.map((result) => snakeToCamel(result)))
	}

	async updateTag(id: number, tag: Partial<z.input<typeof newTagSchema>>) {
		const existingTag = await this.getTag(id)
		if (!existingTag) {
			throw new Error(`Tag with ID ${id} not found`)
		}

		const updates = Object.entries(tag)
			.filter(([, value]) => value !== undefined)
			.map(([key], index) => `${key} = ?${index + 3}`)
			.join(', ')

		if (!updates) {
			return existingTag
		}

		const ps = this.#db.prepare(sql`
			UPDATE tags
			SET ${updates}, updated_at = CURRENT_TIMESTAMP
			WHERE id = ?1
		`)

		const updateValues = [
			id,

			...Object.entries(tag)
				.filter(([, value]) => value !== undefined)
				.map(([, value]) => value),
		]

		const updateResult = await ps.bind(...updateValues).run()

		if (!updateResult.success) {
			throw new Error('Failed to update tag: ' + updateResult.error)
		}

		const updatedTag = await this.getTag(id)
		if (!updatedTag) {
			throw new Error('Failed to query updated tag')
		}

		return updatedTag
	}

	async deleteTag(id: number) {
		const existingTag = await this.getTag(id)
		if (!existingTag) {
			throw new Error(`Tag with ID ${id} not found`)
		}

		const deleteResult = await this.#db
			.prepare(sql`DELETE FROM tags WHERE id = ?1`)
			.bind(id)
			.run()

		if (!deleteResult.success) {
			throw new Error('Failed to delete tag: ' + deleteResult.error)
		}

		return true
	}

	// Entry Tag Methods
	async addTagToEntry(entryTag: NewEntryTag) {
		const validatedEntryTag = newEntryTagSchema.parse(entryTag)

		const entry = await this.getEntry(validatedEntryTag.entryId)
		if (!entry) {
			throw new Error(`Entry with ID ${validatedEntryTag.entryId} not found`)
		}

		const ps = this.#db.prepare(sql`
			INSERT INTO entry_tags (entry_id, tag_id)
			VALUES (?1, ?2)
		`)

		const insertResult = await ps
			.bind(validatedEntryTag.entryId, validatedEntryTag.tagId)
			.run()

		if (!insertResult.success || !insertResult.meta.last_row_id) {
			throw new Error('Failed to add tag to entry: ' + insertResult.error)
		}

		const created = await this.getEntryTag(insertResult.meta.last_row_id)
		if (!created) {
			throw new Error('Failed to query created entry tag')
		}

		return created
	}

	async getEntryTag(id: number) {
		const result = await this.#db
			.prepare(sql`SELECT * FROM entry_tags WHERE id = ?1`)
			.bind(id)
			.first()

		if (!result) return null

		return entryTagSchema.parse(snakeToCamel(result))
	}

	async getEntryTags(entryId: number) {
		const entry = await this.getEntry(entryId)
		if (!entry) {
			throw new Error(`Entry with ID ${entryId} not found`)
		}

		const results = await this.#db
			.prepare(
				sql`
					SELECT t.* 
					FROM tags t
					JOIN entry_tags et ON et.tag_id = t.id
					WHERE et.entry_id = ?1
					ORDER BY t.name
				`,
			)
			.bind(entryId)
			.all()

		return z
			.array(tagSchema)
			.parse(results.results.map((result) => snakeToCamel(result)))
	}
}
