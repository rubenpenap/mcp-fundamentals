// 💰 you're gonna want these imports
// import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
// import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

// 🐨 create a new McpServer
// - it should have a name of 'epicme', title of 'EpicMe', and a version of '1.0.0'
// - it should have instructions for the LLM to know what this server can be used to do (we'll start out by saying it can solve math problems)
// 💰 NOTE: the `instructions` should appear as a property of an object in the second argument of the McpServer constructor
// 📜 If you're unsure how to do this, check out the MCP TypeScript SDK Docs:
//   https://github.com/modelcontextprotocol/typescript-sdk

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
