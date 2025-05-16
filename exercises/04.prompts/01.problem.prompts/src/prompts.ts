// 💰 you'll need this for the argument schema
// import { z } from 'zod'
import { type EpicMeMCP } from './index.ts'

export async function initializePrompts(agent: EpicMeMCP) {
	// 🐨 create a prompt here called "suggest_tags" with a reasonable description
	// 🐨 it should take an entryId as an argument
	// 🐨 the callback should return a prompt message that instructs the assistant to:
	// - lookup the journal entry with the given ID
	// - look up the available tags
	// - suggest tags (creating new ones if necessary)
	// - add approved tags to the entry
}
