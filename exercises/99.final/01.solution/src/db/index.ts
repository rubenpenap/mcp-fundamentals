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
	userSchema,
} from './schema.ts'
import { sql, snakeToCamel } from './utils.ts'

export type { Entry, NewEntry, Tag, NewTag, EntryTag, NewEntryTag }

// TODO: Make a UserDB which has the userId as a private property and move all
// methods that require a userId to that... maybe

export class DB {
	constructor(private db: D1Database) {}

	static async getInstance(env: Env) {
		const db = new DB(env.EPIC_ME_DB)
		await migrate(env.EPIC_ME_DB)
		return db
	}

	async getUserByToken(token: string) {
		// TODO: I don't have internet, so turn this into a single query when I do...
		// also add TAKE 1 or whatever
		const tokensResult = await this.db
			.prepare(sql`SELECT user_id FROM access_tokens WHERE token_value = ?1`)
			.bind(token)
			.first()
		if (!tokensResult) return null

		const userResult = await this.db
			.prepare(sql`SELECT * FROM users WHERE id = ?1`)
			.bind(tokensResult.user_id)
			.first()
		if (!userResult) return null

		return userSchema.parse(snakeToCamel(userResult))
	}

	async getUserByEmail(email: string) {
		const userResult = await this.db
			.prepare(sql`SELECT * FROM users WHERE email = ?1`)
			.bind(email)
			.first()
		if (!userResult) return null

		return userSchema.parse(snakeToCamel(userResult))
	}

	async getAccessTokenIdByValue(tokenValue: string) {
		const tokenResult = await this.db
			.prepare(sql`SELECT id FROM access_tokens WHERE token_value = ?1`)
			.bind(tokenValue)
			.first()
		if (!tokenResult) return null

		return tokenResult.id
	}

	async createAccessTokenIfNecessary(tokenValue: string) {
		const existingAccessTokenId = await this.getAccessTokenIdByValue(tokenValue)
		if (existingAccessTokenId) return existingAccessTokenId

		const insertResult = await this.db
			.prepare(
				sql`
					INSERT INTO access_tokens (token_value)
					VALUES (?1)
				`,
			)
			.bind(tokenValue)
			.run()

		if (!insertResult.success || !insertResult.meta.last_row_id) {
			throw new Error('Failed to create access token: ' + insertResult.error)
		}

		return insertResult.meta.last_row_id
	}

	async createValidationToken(
		email: string,
		accessTokenId: number,
		validationToken: string,
	) {
		const insertResult = await this.db
			.prepare(
				sql`
					INSERT INTO validation_tokens (email, access_token_id, token_value)
					VALUES (?1, ?2, ?3)
				`,
			)
			.bind(email, accessTokenId, validationToken)
			.run()

		if (!insertResult.success || !insertResult.meta.last_row_id) {
			throw new Error(
				'Failed to create validation token: ' + insertResult.error,
			)
		}

		return insertResult.meta.last_row_id
	}

	async validateAccessToken(accessTokenId: number, validationToken: string) {
		const validationResult = await this.db
			.prepare(
				sql`
					SELECT id, email, access_token_id FROM validation_tokens
					WHERE access_token_id = ?1 AND token_value = ?2
				`,
			)
			.bind(accessTokenId, validationToken)
			.first()

		if (!validationResult) {
			throw new Error('Invalid validation token')
		}
		const userResult = await this.db
			.prepare(
				sql`
					SELECT id FROM users
					WHERE email = ?1
				`,
			)
			.bind(validationResult.email)
			.first()

		let userId = userResult?.id
		if (!userResult) {
			const createdUser = await this.createUserByEmail(
				validationResult.email as string,
			)
			userId = createdUser.id
		}

		// set access token to user id
		const claimAccessTokenResult = await this.db
			.prepare(
				sql`
					UPDATE access_tokens
					SET user_id = ?2, updated_at = CURRENT_TIMESTAMP 
					WHERE id = ?1
				`,
			)
			.bind(validationResult.access_token_id, userId)
			.run()

		if (
			!claimAccessTokenResult.success ||
			!claimAccessTokenResult.meta.last_row_id
		) {
			throw new Error('Failed to create user: ' + claimAccessTokenResult.error)
		}

		// delete validation token (fire and forget)
		// TODO: I think there's a more appropriate way to do this in a worker...
		void this.db
			.prepare(sql`DELETE FROM validation_tokens WHERE id = ?1`)
			.bind(validationResult.id)
			.run()

		return {
			id: userId,
			email: validationResult.email,
		}
	}

	async deleteAccessToken(userId: number, tokenValue: string) {
		await this.db
			.prepare(
				sql`
					DELETE FROM access_tokens
					WHERE user_id = ?1 AND token_value = ?2
				`,
			)
			.bind(userId, tokenValue)
			.run()
	}

	async createUserByEmail(email: string) {
		const ps = this.db.prepare(sql`
			INSERT INTO users (email)
			VALUES (?1)
		`)

		const insertResult = await ps.bind(email).run()

		if (!insertResult.success || !insertResult.meta.last_row_id) {
			throw new Error('Failed to create user: ' + insertResult.error)
		}

		// Fetch the created user
		const createdUser = await this.getUserById(insertResult.meta.last_row_id)
		if (!createdUser) {
			throw new Error('Failed to query created user')
		}

		return createdUser
	}

	async getUserById(id: number) {
		const userResult = await this.db
			.prepare(sql`SELECT * FROM users WHERE id = ?1`)
			.bind(id)
			.first()
		if (!userResult) return null

		return userSchema.parse(snakeToCamel(userResult))
	}

	// Entry Methods
	async createEntry(userId: number, entry: z.input<typeof newEntrySchema>) {
		// Validate input
		const validatedEntry = newEntrySchema.parse(entry)

		const ps = this.db.prepare(sql`
			INSERT INTO entries (
				user_id, title, content, mood, location, weather,
				is_private, is_favorite
			) VALUES (
				?1, ?2, ?3, ?4, ?5, ?6,
				?7, ?8
			)
		`)

		const insertResult = await ps
			.bind(
				userId,
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
		const createdEntry = await this.getEntry(
			userId,
			insertResult.meta.last_row_id,
		)
		if (!createdEntry) {
			throw new Error('Failed to query created entry')
		}

		return createdEntry
	}

	async getEntry(userId: number, id: number) {
		const result = await this.db
			.prepare(sql`SELECT * FROM entries WHERE id = ?1 AND user_id = ?2`)
			.bind(id, userId)
			.first()

		if (!result) return null

		return entrySchema.parse(snakeToCamel(result))
	}

	async listEntries(userId: number) {
		const results = await this.db
			.prepare(
				sql`SELECT * FROM entries WHERE user_id = ?1 ORDER BY created_at DESC`,
			)
			.bind(userId)
			.all()

		return z
			.array(entrySchema)
			.parse(results.results.map((result) => snakeToCamel(result)))
	}

	async updateEntry(
		userId: number,
		id: number,
		entry: Partial<z.input<typeof newEntrySchema>>,
	) {
		const existingEntry = await this.getEntry(userId, id)
		if (!existingEntry) {
			throw new Error(`Entry with ID ${id} not found`)
		}

		const updates = Object.entries(entry)
			.filter(([key, value]) => value !== undefined && key !== 'userId')
			.map(
				([key], index) =>
					`${key === 'isPrivate' ? 'is_private' : key === 'isFavorite' ? 'is_favorite' : key} = ?${index + 3}`,
			)
			.join(', ')

		if (!updates) {
			return existingEntry
		}

		const ps = this.db.prepare(sql`
			UPDATE entries 
			SET ${updates}, updated_at = CURRENT_TIMESTAMP 
			WHERE id = ?1 AND user_id = ?2
		`)

		const updateValues = [
			id,
			userId,
			...Object.entries(entry)
				.filter(([key, value]) => value !== undefined && key !== 'userId')
				.map(([, value]) => value),
		]

		const updateResult = await ps.bind(...updateValues).run()

		if (!updateResult.success) {
			throw new Error('Failed to update entry: ' + updateResult.error)
		}

		const updatedEntry = await this.getEntry(userId, id)
		if (!updatedEntry) {
			throw new Error('Failed to query updated entry')
		}

		return updatedEntry
	}

	async deleteEntry(userId: number, id: number) {
		const existingEntry = await this.getEntry(userId, id)
		if (!existingEntry) {
			throw new Error(`Entry with ID ${id} not found`)
		}

		// First delete all entry tags
		await this.db
			.prepare(sql`DELETE FROM entry_tags WHERE entry_id = ?1`)
			.bind(id)
			.run()

		// Then delete the entry
		const deleteResult = await this.db
			.prepare(sql`DELETE FROM entries WHERE id = ?1 AND user_id = ?2`)
			.bind(id, userId)
			.run()

		if (!deleteResult.success) {
			throw new Error('Failed to delete entry: ' + deleteResult.error)
		}

		return true
	}

	// Tag Methods
	async createTag(userId: number, tag: NewTag) {
		const validatedTag = newTagSchema.parse(tag)

		const ps = this.db.prepare(sql`
			INSERT INTO tags (name, description, user_id)
			VALUES (?1, ?2, ?3)
		`)

		const insertResult = await ps
			.bind(validatedTag.name, validatedTag.description, userId)
			.run()

		if (!insertResult.success || !insertResult.meta.last_row_id) {
			throw new Error('Failed to create tag: ' + insertResult.error)
		}

		const createdTag = await this.getTag(userId, insertResult.meta.last_row_id)
		if (!createdTag) {
			throw new Error('Failed to query created tag')
		}

		return createdTag
	}

	async getTag(userId: number, id: number) {
		const result = await this.db
			.prepare(sql`SELECT * FROM tags WHERE id = ?1 AND user_id = ?2`)
			.bind(id, userId)
			.first()

		if (!result) return null

		return tagSchema.parse(snakeToCamel(result))
	}

	async listTags() {
		const results = await this.db
			.prepare(sql`SELECT * FROM tags ORDER BY name`)
			.all()

		return z
			.array(tagSchema)
			.parse(results.results.map((result) => snakeToCamel(result)))
	}

	async updateTag(
		userId: number,
		id: number,
		tag: Partial<z.input<typeof newTagSchema>>,
	) {
		const existingTag = await this.getTag(userId, id)
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

		const ps = this.db.prepare(sql`
			UPDATE tags 
			SET ${updates}, updated_at = CURRENT_TIMESTAMP 
			WHERE id = ?1 AND user_id = ?2
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

		const updatedTag = await this.getTag(userId, id)
		if (!updatedTag) {
			throw new Error('Failed to query updated tag')
		}

		return updatedTag
	}

	async deleteTag(userId: number, id: number) {
		const existingTag = await this.getTag(userId, id)
		if (!existingTag) {
			throw new Error(`Tag with ID ${id} not found`)
		}

		// First delete all entry tags
		await this.db
			.prepare(sql`DELETE FROM entry_tags WHERE tag_id = ?1 AND user_id = ?2`)
			.bind(id, userId)
			.run()

		// Then delete the tag
		const deleteResult = await this.db
			.prepare(sql`DELETE FROM tags WHERE id = ?1 AND user_id = ?2`)
			.bind(id, userId)
			.run()

		if (!deleteResult.success) {
			throw new Error('Failed to delete tag: ' + deleteResult.error)
		}

		return true
	}

	// Entry Tag Methods
	async addTagToEntry(userId: number, entryTag: NewEntryTag) {
		const validatedEntryTag = newEntryTagSchema.parse(entryTag)

		// Verify the entry belongs to the user
		const entry = await this.getEntry(userId, validatedEntryTag.entryId)
		if (!entry) {
			throw new Error(`Entry with ID ${validatedEntryTag.entryId} not found`)
		}

		const ps = this.db.prepare(sql`
			INSERT INTO entry_tags (entry_id, tag_id, user_id)
			VALUES (?1, ?2, ?3)
		`)

		const insertResult = await ps
			.bind(validatedEntryTag.entryId, validatedEntryTag.tagId, userId)
			.run()

		if (!insertResult.success || !insertResult.meta.last_row_id) {
			throw new Error('Failed to add tag to entry: ' + insertResult.error)
		}

		const created = await this.getEntryTag(
			userId,
			insertResult.meta.last_row_id,
		)
		if (!created) {
			throw new Error('Failed to query created entry tag')
		}

		return created
	}

	async getEntryTag(userId: number, id: number) {
		const result = await this.db
			.prepare(sql`SELECT * FROM entry_tags WHERE id = ?1 AND user_id = ?2`)
			.bind(id)
			.first()

		if (!result) return null

		return entryTagSchema.parse(snakeToCamel(result))
	}

	async getEntryTags(userId: number, entryId: number) {
		// First verify the entry belongs to the user
		const entry = await this.getEntry(userId, entryId)
		if (!entry) {
			throw new Error(`Entry with ID ${entryId} not found`)
		}

		const results = await this.db
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
