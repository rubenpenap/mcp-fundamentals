import { userInfo } from 'node:os'
import { type EpicMeMCP } from './index.ts'

export async function initializeResources(agent: EpicMeMCP) {
	agent.server.resource(
		'credits',
		'epicme://credits',
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
}
