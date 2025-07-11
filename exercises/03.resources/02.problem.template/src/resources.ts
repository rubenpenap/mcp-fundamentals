// 💰 you'll use both of these in this exercise:
// import { invariant } from '@epic-web/invariant'
// import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
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

	// 🐨 create two resources with a ResourceTemplate:
	// - entry - URI: epicme://entries/{id} (💰 use await agent.db.getEntry)
	// - tag - URI: epicme://tags/{id} (💰 use await agent.db.getTag)
	// 🐨 the ResourceTemplate for each should set the "list" property to "undefined" for now
	// 🐨 each should have a title and description
	// 🐨 each should have a callback that reads the entry or tag for the given id
	// 🐨 return contents with mimeType application/json and the entry or tag
	// 💯 as extra credit, handle the case where the id is not found (you can use invariant for this)
}
