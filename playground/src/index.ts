import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { DB } from './db/index.ts'
import { initializeResources } from './resources.ts'
import { initializeTools } from './tools.ts'

export class EpicMeMCP {
	db: DB
	server = new McpServer(
		{
			name: 'epicme',
			title: 'EpicMe',
			version: '1.0.0',
		},
		{
			capabilities: {
				tools: {},
				resources: {},
				// 🐨 add completions capability
			},
			instructions: `
EpicMe: Personal journaling server with AI-powered organization.

## Core Workflow
- Create: \`create_entry\` → \`list_tags\` → \`create_tag\` (if needed) → \`add_tag_to_entry\`

## Best Practices
- Check \`list_tags\` before creating new tags to avoid duplicates
- Use \`list_entries\` to find specific entry IDs before \`get_entry\`

## Common Requests
- "Write in my journal" → \`create_entry\`
- "Show me my entries" → \`list_entries\` or \`view_journal\`
- "Organize my entries" → \`list_tags\` then \`create_tag\` and \`add_tag_to_entry\`
			`.trim(),
		},
	)

	constructor(path: string) {
		this.db = DB.getInstance(path)
	}
	async init() {
		await initializeTools(this)
		await initializeResources(this)
	}
}

async function main() {
	const agent = new EpicMeMCP(process.env.EPIC_ME_DB_PATH ?? './db.sqlite')
	await agent.init()
	const transport = new StdioServerTransport()
	await agent.server.connect(transport)
	console.error('EpicMe MCP Server running on stdio')
}

main().catch((error) => {
	console.error('Fatal error in main():', error)
	process.exit(1)
})
