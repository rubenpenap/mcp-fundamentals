import { invariant } from '@epic-web/invariant'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type EpicMeMCP } from './index.ts'

export async function initializeResources(agent: EpicMeMCP) {
	agent.server.registerResource(
		'tags',
		'epicme://tags',
		{
			title: 'All tags',
			description: 'All tags',
		},
		async (uri) => {
			const tags = await agent.db.getTags()
			return {
				contents: [
					{
						mimeType: 'application/json',
						text: JSON.stringify(tags),
						uri: uri.toString(),
					},
				],
			}
		},
	)

	agent.server.registerResource(
		'tag',
		new ResourceTemplate('epicme://tags/{id}', {
			// 🐨 implement this list callback to get all tags (💰 agent.db.getTags())
			// 🐨 return an array of resource listings (💰 each object has a name, uri, and mimeType).
			list: undefined,
		}),
		{
			title: 'A single tag',
			description: 'A single tag',
		},
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

	agent.server.registerResource(
		'entry',
		new ResourceTemplate('epicme://entries/{id}', {
			// 🐨 implement this list callback to get all entries (💰 agent.db.getEntries())
			// 🐨 return an array of resource listings (💰 each object has a name, uri, and mimeType).
			list: undefined,
		}),
		{
			title: 'A single entry',
			description: 'A single entry',
		},
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
}
