// 💰 you're gonna want these imports
// import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
// import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
// import { z } from 'zod'

// 🐨 create a new McpServer
// - it should have a name of 'EpicMath' and a version of '1.0.0'
// - it should have a capabilities object with a tools property that is an empty object
// - it should have instructions for the LLM to know what this server can be used to do

// 🐨 add a tool to the server with the server.tool API
// - it should be named 'add'
// - it should have a description explaining what it can be used to do
// - provide an input schema object with two properties which are validated with zod (give them descriptions as well):
//   - firstNumber: a number
//   - secondNumber: a number
// - it should return a standard text response with the sum of the two numbers

async function main() {
	// 🐨 create a new StdioServerTransport
	// 🐨 connect the server to the transport

	// 🐨 add a log (using console.error) to the console to let the user know the server is running

	// 💣 you can delete this once you're done
	throw new Error('Not implemented')
}

main().catch((error) => {
	console.error('Fatal error in main():', error)
	process.exit(1)
})
