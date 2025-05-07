import { invariant } from '@epic-web/invariant'
import { z } from 'zod'
import { type EpicMeMCP } from './index.ts'

export async function suggestTagsSampling(agent: EpicMeMCP, entryId: number) {
	const entry = await agent.db.getEntry(entryId)
	invariant(entry, `Entry with ID "${entryId}" not found`)

	const existingTags = await agent.db.getTags()
	const currentTags = await agent.db.getEntryTags(entry.id)

	const result = await agent.server.server.createMessage({
		// 🐨 update this system prompt to explain what the LLM should do with the JSON
		// we're going to pass to it.
		// 🦉 You can develop this by chatting with an LLM yourself. Write out a
		// prompt, give it to the LLM, and then paste some example JSON in and see
		// whether the LLM responds as you expect. Check the bottom of the file for
		// an example of the JSON you can use to test your prompt.
		// 🐨 Note: we're expecting the LLM to respond with a JSON array of tag objects.
		// Existing tags have an "id" property, new tags have a "name" and "description" property.
		// So make sure you prompt it to respond correctly
		// 💰 providing the LLM example responses helps a lot!
		systemPrompt: `
You are a helpful assistant.

We'll put more in here later...
		`.trim(),
		messages: [
			{
				role: 'user',
				content: {
					type: 'text',
					// 🐨 change this to application/json
					mimeType: 'text/plain',
					// 🐨 Stringify JSON with the entry, currentTags, and existingTags
					text: `
You just created a new journal entry with the id ${entryId}.

Please respond with a proper commendation for yourself.
					`.trim(),
				},
			},
		],
		// 🐨 increase this to 300 or so...
		maxTokens: 10,
	})

	const resultSchema = z.object({
		content: z.object({
			type: z.literal('text'),
			text: z.string(),
		}),
	})
	const parsedResult = resultSchema.parse(result)

	const existingTagSchema = z.object({ id: z.number() })
	const newTagSchema = z.object({
		name: z.string(),
		description: z.string().optional(),
	})

	type ExistingSuggestedTag = z.infer<typeof existingTagSchema>
	type NewSuggestedTag = z.infer<typeof newTagSchema>
	type SuggestedTag = ExistingSuggestedTag | NewSuggestedTag

	function isExistingTagSuggestion(
		tag: SuggestedTag,
	): tag is ExistingSuggestedTag {
		return (
			'id' in tag &&
			existingTags.some((t) => t.id === tag.id) &&
			!currentTags.every((t) => t.id !== tag.id)
		)
	}

	function isNewTagSuggestion(tag: SuggestedTag): tag is NewSuggestedTag {
		return 'name' in tag && existingTags.every((t) => t.name !== tag.name)
	}

	const responseSchema = z.array(z.union([existingTagSchema, newTagSchema]))

	const suggestedTags = responseSchema.parse(
		JSON.parse(parsedResult.content.text),
	)

	const suggestedNewTags = suggestedTags.filter(isNewTagSuggestion)
	const suggestedExistingTags = suggestedTags.filter(isExistingTagSuggestion)

	const idsToAdd = new Set<number>(suggestedExistingTags.map((t) => t.id))

	if (suggestedNewTags.length > 0) {
		for (const tag of suggestedNewTags) {
			const newTag = await agent.db.createTag(tag)
			idsToAdd.add(newTag.id)
		}
	}

	for (const tagId of idsToAdd) {
		await agent.db.addTagToEntry({
			entryId: entry.id,
			tagId,
		})
	}
	console.error('Added tags to entry', entry.id, idsToAdd)
}

// 🦉 You can use this JSON to test your prompt:
// 1. Write your prompt into the LLM chat
// 2. Let it respond (It'll probably ask you to provide the JSON)
// 3. Paste the JSON below into the chat and let it respond again
// 4. Evaluate the response (make sure it's in the right format)
// 5. Repeat in new chats until you're happy with the prompt/response
/*
{
  "entry": {
    "id": 6,
    "title": "Day at the Beach with Family",
    "content": "Spent the whole day at the beach with the family and it couldn't have been better. The kids were totally absorbed in building a massive sandcastle—complete with towers, moats, and even a seaweed flag. We played catch, flew a kite, and waded into the water until our fingers turned into prunes. Rebecca and I went on a shell hunt and found a few keepers. Lunch was sandy PB&Js and watermelon under a big striped umbrella. We stayed until sunset, which painted the sky with ridiculous pinks and oranges. Everyone was sun-tired and happy. Grateful for days like this.",
    "mood": "grateful",
    "location": "beach",
    "weather": "sunny",
    "isPrivate": 0,
    "isFavorite": 1,
    "createdAt": 1746668878,
    "updatedAt": 1746668878,
    "tags": [{"id": 1, "name": "Family"}]
  },
  "currentTags": [
    {
      "id": 1,
      "name": "Family",
      "description": "Spending time with family members",
      "createdAt": 1746666966,
      "updatedAt": 1746666966
    }
  ],
  "existingTags": [
    {
      "id": 1,
      "name": "Family",
      "description": "Spending time with family members",
      "createdAt": 1746666966,
      "updatedAt": 1746666966
    },
    {
      "id": 2,
      "name": "Outdoors",
      "description": "Entries about being outside in nature or open spaces",
      "createdAt": 1746667900,
      "updatedAt": 1746667900
    },
    {
      "id": 3,
      "name": "Exercise",
      "description": "Physical activity or movement",
      "createdAt": 1746668000,
      "updatedAt": 1746668000
    },
    {
      "id": 4,
      "name": "Food",
      "description": "Eating, meals, or anything food-related",
      "createdAt": 1746668001,
      "updatedAt": 1746668001
    }
  ]
}
*/
