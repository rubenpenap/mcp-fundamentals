import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
// 🐨 bring in the database and initialize it.
// 💰 here's the import:
// import { DB } from './db/index.ts'

// 💰 Here's how you initialize the database:
// const db = DB.getInstance('./db.sqlite')

const server = new McpServer(
	{
		name: 'EpicMe',
		version: '1.0.0',
	},
	{
		capabilities: {
			tools: {},
		},
		// 🐨 update the instructions to describe a journaling app
		instructions: 'This lets you solve math problems.',
	},
)

server.tool(
	// 🐨 rename this tool to `create_tag`
	'add',
	// 🐨 update the description to describe a tool that creates a tag for entries
	'Add two numbers',
	// 🐨 update the arguments to take a name and description as arguments (💯 add a description to each argument)
	{
		firstNumber: z.number().describe('The first number to add'),
		secondNumber: z.number().describe('The second number to add'),
	},
	// 🐨 accept the tag as an argument
	async ({ firstNumber, secondNumber }) => {
		// 🐨 create the tag:
		// 💰 const createdTag = await db.createTag(tag)
		return {
			content: [
				{
					type: 'text',
					text: `The sum of ${firstNumber} and ${secondNumber} is ${firstNumber + secondNumber}.`,
				},
			],
		}
	},
)

async function main() {
	const transport = new StdioServerTransport()
	await server.connect(transport)
	console.error('EpicMe MCP Server running on stdio')
}

main().catch((error) => {
	console.error('Fatal error in main():', error)
	process.exit(1)
})
