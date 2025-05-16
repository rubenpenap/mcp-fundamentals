// 💰 you'll use this to get the username of the creator of the app
// import { userInfo } from 'node:os'
import { type EpicMeMCP } from './index.ts'

export async function initializeResources(agent: EpicMeMCP) {
	// 🐨 create a resource called "credits" with the URI meta://credits
	// this tool will return a string with the credits for the creators of the app
	// so set the description to explain that
	// 🐨 the handler accepts the uri and returns the contents array which should
	// have an object with mimeType text/plain, text, and uri
	// 💰 You can use this for the text:
	// `This app was created by ${userInfo().username}`
}
