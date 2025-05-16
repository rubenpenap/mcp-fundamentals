import { z } from 'zod'
import { type EpicMeMCP } from './index.ts'

export async function suggestTagsSampling(agent: EpicMeMCP, entryId: number) {
	const result = await agent.server.server.createMessage({
		systemPrompt: `
You are a helpful assistant.

We'll put more in here later...
		`.trim(),
		messages: [
			{
				role: 'user',
				content: {
					type: 'text',
					mimeType: 'text/plain',
					text: `
You just created a new journal entry with the id ${entryId}.

Please respond with a proper commendation for yourself.
					`.trim(),
				},
			},
		],
		maxTokens: 10,
	})

	const resultSchema = z.object({
		content: z.object({
			type: z.literal('text'),
			text: z.string(),
		}),
	})
	const parsedResult = resultSchema.parse(result)
	console.error('Received response:', parsedResult.content.text)
}
