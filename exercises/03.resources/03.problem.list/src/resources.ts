import { invariant } from '@epic-web/invariant'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type EpicMeMCP } from './index.ts'

export async function initializeResources(agent: EpicMeMCP) {
	agent.server.registerResource(
		'tags',
		'epicme://tags',
		{
			title: 'Tags',
			description: 'All tags currently in the database',
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
			// 🐨 return an object with a "resources" property that is an array of resource listings (💰 each object has a name, uri, and mimeType).
			list: undefined,
		}),
		{
			title: 'Tag',
			description: 'A single tag with the given ID',
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
			// 🦉 there are probably too many journal entries to list them all, so
			// we'll not implement the list callback for this resource template.
			list: undefined,
		}),
		{
			title: 'Journal Entry',
			description: 'A single journal entry with the given ID',
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
