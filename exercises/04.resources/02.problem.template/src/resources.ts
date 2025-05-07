import { userInfo } from 'node:os'
// 💰 you'll use both of these in this exercise:
// import { invariant } from '@epic-web/invariant'
// import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import { type EpicMeMCP } from './index.ts'
import { getErrorMessage } from './utils.ts'

export async function initializeResources(agent: EpicMeMCP) {
	agent.server.resource(
		'credits',
		'meta://credits',
		{
			description: 'Credits for the creators of the app',
		},
		async (uri) => {
			try {
				return {
					contents: [
						{
							mimeType: 'text/plain',
							text: `This app was created by ${userInfo().username}`,
							uri: uri.toString(),
						},
					],
				}
			} catch (error) {
				return createErrorReply(uri, error)
			}
		},
	)

	// 🐨 create two resources with a ResourceTemplate:
	// - entry - URI: entry://{id}
	// - tag - URI: tag://{id}
	// 🐨 each should have a list method that returns all the entries and tags (respectively)
	// 🐨 each should have a description
	// 🐨 each should have a callback that reads the entry or tag for the given id
	// 🐨 return contents with mimeType application/json and the entry or tag
	// 💯 as extra credit, handle the case where the id is not found (you can use invariant for this)
}

function createErrorReply(uri: URL, error: unknown): ReadResourceResult {
	console.error(`Failed running resource:\n`, error)
	return {
		isError: true,
		contents: [
			{
				mimeType: 'text/plain',
				text: getErrorMessage(error),
				uri: uri.toString(),
			},
		],
	}
}
