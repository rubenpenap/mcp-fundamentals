// 💰 you're gonna want these imports
// import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
// import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

// 🐨 create a new McpServer
// - it should have a name of 'EpicMe' and a version of '1.0.0'
// - it should have instructions for the LLM to know what this server can be used to do

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
