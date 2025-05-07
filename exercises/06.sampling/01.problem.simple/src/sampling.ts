// 💰 import zod
// import { z } from 'zod'
import { type EpicMeMCP } from './index.ts'

export async function suggestTagsSampling(agent: EpicMeMCP, entryId: number) {
	// 🐨 create a message with the server's server
	// 💰 agent.server.server.createMessage
	// 🐨 Make the system prompt something simple to start like "you're a helpful assistant"
	// 🐨 Add a user message with the content "You just created a new journal entry with the id ${entryId}. Please respond with a proper commendation for yourself."
	// 🐨 Set the maxTokens what you think is reasonable for the request
	//
	// 🐨 parse the result with zod
	// 💰 I'll just give you the schema here:
	// const resultSchema = z.object({
	// 	content: z.object({
	// 		type: z.literal('text'),
	// 		text: z.string(),
	// 	}),
	// })
	// 💰 resultSchema.parse(result)
	// 🐨 add a console.error to print the result (this will show up in the inspector)
}
