/// <reference path="../types/worker-configuration.d.ts" />

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { DB } from './db/index.ts'
import { initializeTools } from './tools.ts'
import { type Env } from './types'

export class EpicMeMCP extends McpAgent<Env> {
	db!: DB
	server = new McpServer(
		{
			name: 'EpicMe',
			version: '1.0.0',
		},
		{
			instructions: `
EpicMe is a journaling app that allows users to write about and review their experiences, thoughts, and reflections.

These tools are the user's window into their journal. With these tools and your help, they can create, read, and manage their journal entries and associated tags.

You can also help users add tags to their entries and get all tags for an entry.
`.trim(),
		},
	)
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env)

		// Initialize database with migrations
		void ctx.blockConcurrencyWhile(async () => {
			this.db = await DB.getInstance(env)
		})
	}

	async init() {
		await initializeTools(this)
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url)

		if (url.pathname === '/sse' || url.pathname === '/sse/message') {
			return EpicMeMCP.serveSSE('/sse', {
				binding: 'EPIC_ME_MCP_OBJECT',
			}).fetch(request, env, ctx)
		}

		if (url.pathname === '/mcp') {
			return EpicMeMCP.serve('/mcp', { binding: 'EPIC_ME_MCP_OBJECT' }).fetch(
				request,
				env,
				ctx,
			)
		}

		return new Response('Not found', { status: 404 })
	},
}
