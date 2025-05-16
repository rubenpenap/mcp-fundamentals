import { userInfo } from 'node:os'
import { invariant } from '@epic-web/invariant'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type EpicMeMCP } from './index.ts'

export async function initializeResources(agent: EpicMeMCP) {
	agent.server.resource(
		'credits',
		'meta://credits',
		{
			description: 'Credits for the creators of the app',
		},
		async (uri) => {
			return {
				contents: [
					{
						mimeType: 'text/plain',
						text: `This app was created by ${userInfo().username}`,
						uri: uri.toString(),
					},
				],
			}
		},
	)

	agent.server.resource(
		'entry',
		new ResourceTemplate('entry://{id}', {
			list: async () => {
				const entries = await agent.db.getEntries()
				return {
					resources: entries.map((entry) => ({
						name: entry.title,
						uri: `entry://${entry.id}`,
						mimeType: 'application/json',
					})),
				}
			},
		}),
		{ description: 'A single entry' },
		async (uri, { id }) => {
			const entry = await agent.db.getEntry(Number(id))
			invariant(entry, `Entry with ID "${id}" not found`)
			return {
				contents: [
					{
						mimeType: 'application/json',
						text: JSON.stringify(entry),
						uri: uri.toString(),
					},
				],
			}
		},
	)

	agent.server.resource(
		'tag',
		new ResourceTemplate('tag://{id}', {
			list: async () => {
				const tags = await agent.db.getTags()
				return {
					resources: tags.map((tag) => ({
						name: tag.name,
						uri: `tag://${tag.id}`,
						mimeType: 'application/json',
					})),
				}
			},
		}),
		{ description: 'A single tag' },
		async (uri, { id }) => {
			const tag = await agent.db.getTag(Number(id))
			invariant(tag, `Tag with ID "${id}" not found`)
			return {
				contents: [
					{
						mimeType: 'application/json',
						text: JSON.stringify(tag),
						uri: uri.toString(),
					},
				],
			}
		},
	)
}
