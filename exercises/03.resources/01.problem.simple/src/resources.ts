import { type EpicMeMCP } from './index.ts'

export async function initializeResources(agent: EpicMeMCP) {
	// 🐨 create a resource called "tags" with the URI epicme://tags using agent.server.registerResource
	// - the config object should include a user-facing title and an llm-facing description for the resource
	// - the handler accepts the uri and returns the contents array which should
	//   have an object with mimeType application/json, text, and uri
	// 💰 You can use this to get the tags
	// `await agent.db.getTags()`
}
