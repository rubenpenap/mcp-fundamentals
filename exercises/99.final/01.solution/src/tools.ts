import { invariant } from '@epic-web/invariant'
import { z } from 'zod'
import { type EpicMeMCP } from './index.ts'
import { getErrorMessage } from './utils.ts'

const createEntryInputSchema = {
	title: z.string().describe('The title of the entry'),
	content: z.string().describe('The content of the entry'),
	mood: z
		.string()
		.optional()
		.nullable()
		.describe(
			'The mood of the entry (for example: "happy", "sad", "anxious", "excited")',
		),
	location: z
		.string()
		.optional()
		.nullable()
		.describe(
			'The location of the entry (for example: "home", "work", "school", "park")',
		),
	weather: z
		.string()
		.optional()
		.nullable()
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

export function initializeTools(agent: EpicMeMCP) {
	agent.server.tool(
		'authenticate',
		`Authenticate to your account or create a new account. Only do this when explicitely told to do so.`,
		{
			email: z
				.string()
				.email()
				.describe(
					`
The user's email address for their account.

Please ask them explicitely for this and don't just guess.
			`.trim(),
				),
		},
		async ({ email }) => {
			try {
				const accessTokenId = await agent.db.getAccessTokenIdByValue(
					agent.props.accessToken,
				)
				invariant(typeof accessTokenId === 'number', () => {
					console.error(
						'This should not happen. The accessTokenId is not a number',
						{ accessTokenId, accessToken: agent.props.accessToken },
					)
					return `accessTokenId for the given access token is not of type number, it's a "${typeof accessTokenId}" (${accessTokenId})`
				})
				const otp = Array.from({ length: 6 }, () =>
					Math.random().toFixed(1).slice(2),
				).join('')
				await agent.db.createValidationToken(email, accessTokenId, otp)
				console.log(`Email: Here's your EpicMeMCP validation token: ${otp}`)
				// TODO: send an actual email
				// TODO: generate a OTP
				return {
					content: [
						{
							type: 'text',
							text: `The user has been sent an email to ${email} with a validation token. Please have the user submit that token using the validate_token tool.`,
						},
					],
				}
			} catch (error) {
				console.error('Failed to authenticate:', error)
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

	agent.server.tool(
		'validate_token',
		'Validate a token which was emailed',
		{
			validationToken: z
				.string()
				.describe(
					'The validation token the user received in their email inbox from the authenticate tool',
				),
		},
		async ({ validationToken }) => {
			try {
				const accessTokenId = await agent.db.getAccessTokenIdByValue(
					agent.props.accessToken,
				)
				invariant(typeof accessTokenId === 'number', () => {
					console.error(
						'This should not happen. The accessTokenId is not a number',
						{ accessTokenId, accessToken: agent.props.accessToken },
					)
					return `accessTokenId for the given access token is not of type number, it's a "${typeof accessTokenId}" (${accessTokenId})`
				})

				const user = await agent.db.validateAccessToken(
					accessTokenId,
					validationToken,
				)

				return {
					content: [
						{
							type: 'text',
							text: `The user's token has been validated as the owner of the account "${user.email}" (ID: ${user.id}). The user can now execute authenticated tools.`,
						},
					],
				}
			} catch (error) {
				console.error('Failed to validate token:', error)
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: `Failed to validate token: ${getErrorMessage(error)}`,
						},
					],
				}
			}
		},
	)

	agent.server.tool(
		'whoami',
		'Get information about the currently logged in user',
		async () => {
			try {
				const user = await requireUser()
				return {
					content: [{ type: 'text', text: JSON.stringify(user) }],
				}
			} catch (error) {
				console.error('Failed to get user info:', error)
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: `Failed to get user info: ${getErrorMessage(error)}`,
						},
					],
				}
			}
		},
	)

	agent.server.tool('logout', 'Remove authentication information', async () => {
		try {
			const user = await requireUser()
			await agent.db.deleteAccessToken(user.id, agent.props.accessToken)
			return {
				content: [{ type: 'text', text: 'Logout successful' }],
			}
		} catch (error) {
			console.error('Failed to logout:', error)
			return {
				isError: true,
				content: [
					{
						type: 'text',
						text: `Failed to logout: ${getErrorMessage(error)}`,
					},
				],
			}
		}
	})

	// Entry Tools
	agent.server.tool(
		'create_entry',
		'Create a new journal entry',
		createEntryInputSchema,
		async (entry) => {
			try {
				const user = await requireUser()
				const createdEntry = await agent.db.createEntry(user.id, entry)
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

	agent.server.tool(
		'get_entry',
		'Get a journal entry by ID',
		{
			id: z.number().describe('The ID of the entry'),
		},
		async ({ id }) => {
			try {
				const user = await requireUser()
				const entry = await agent.db.getEntry(id, user.id)
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

	agent.server.tool('list_entries', 'List all journal entries', async () => {
		try {
			const user = await requireUser()
			console.log({ user })
			const entries = await agent.db.listEntries(user.id)
			return {
				content: [{ type: 'text', text: JSON.stringify(entries, null, 2) }],
			}
		} catch (error) {
			console.error('Failed to list entries:', error)
			return {
				isError: true,
				content: [
					{
						type: 'text',
						text: `Failed to list entries: ${getErrorMessage(error)}`,
					},
				],
			}
		}
	})

	agent.server.tool(
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
				const user = await requireUser()
				const existingEntry = await agent.db.getEntry(user.id, id)
				invariant(existingEntry, `Entry with ID "${id}" not found`)
				const updatedEntry = await agent.db.updateEntry(user.id, id, updates)
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

	agent.server.tool(
		'delete_entry',
		'Delete a journal entry',
		{
			id: z.number().describe('The ID of the entry'),
		},
		async ({ id }) => {
			try {
				const user = await requireUser()
				const existingEntry = await agent.db.getEntry(user.id, id)
				invariant(existingEntry, `Entry with ID "${id}" not found`)
				await agent.db.deleteEntry(user.id, id)
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
	agent.server.tool(
		'create_tag',
		'Create a new tag',
		createTagInputSchema,
		async (tag) => {
			try {
				const user = await requireUser()
				const createdTag = await agent.db.createTag(user.id, tag)
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

	agent.server.tool(
		'get_tag',
		'Get a tag by ID',
		{
			id: z.number().describe('The ID of the tag'),
		},
		async ({ id }) => {
			try {
				const user = await requireUser()
				const tag = await agent.db.getTag(user.id, id)
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

	agent.server.tool('list_tags', 'List all tags', async () => {
		try {
			const tags = await agent.db.listTags()
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

	agent.server.tool(
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
				const user = await requireUser()
				const existingTag = await agent.db.getTag(user.id, id)
				invariant(existingTag, `Tag with ID "${id}" not found`)
				const updatedTag = await agent.db.updateTag(user.id, id, updates)
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

	agent.server.tool(
		'delete_tag',
		'Delete a tag',
		{
			id: z.number().describe('The ID of the tag'),
		},
		async ({ id }) => {
			try {
				const user = await requireUser()
				const existingTag = await agent.db.getTag(user.id, id)
				invariant(existingTag, `Tag ID "${id}" not found`)
				await agent.db.deleteTag(user.id, id)
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
	agent.server.tool(
		'add_tag_to_entry',
		'Add a tag to an entry',
		{
			entryId: z.number().describe('The ID of the entry'),
			tagId: z.number().describe('The ID of the tag'),
		},
		async ({ entryId, tagId }) => {
			try {
				const user = await requireUser()
				const tag = await agent.db.getTag(user.id, tagId)
				const entry = await agent.db.getEntry(user.id, entryId)
				invariant(tag, `Tag ${tagId} not found`)
				invariant(entry, `Entry with ID "${entryId}" not found`)
				const entryTag = await agent.db.addTagToEntry(user.id, {
					entryId,
					tagId,
				})
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

	agent.server.tool(
		'get_entry_tags',
		'Get all tags for an entry',
		{
			entryId: z.number().describe('The ID of the entry'),
		},
		async ({ entryId }) => {
			try {
				const user = await requireUser()
				const entry = await agent.db.getEntry(user.id, entryId)
				invariant(entry, `Entry with ID "${entryId}" not found`)
				const tags = await agent.db.getEntryTags(user.id, entryId)
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

	async function requireUser() {
		const { accessToken: accessToken } = agent.props
		invariant(accessToken, 'You must be logged in to perform this action')
		await agent.db.createAccessTokenIfNecessary(accessToken)
		const user = await agent.db.getUserByToken(accessToken)
		invariant(
			user,
			`No user found with the given accessToken. Please claim the token by invoking the "authenticate" tool.`,
		)
		return user
	}
}
