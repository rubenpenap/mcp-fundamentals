/// <reference path="../types/worker-configuration.d.ts" />

import { OAuthProvider } from '@cloudflare/workers-oauth-provider'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { DB } from './db'
import { initializeTools } from './tools.ts'
import { type Env } from './types'

type State = {}
type Props = { grantId: string; grantUserId: string }

export class EpicMeMCP extends McpAgent<Env, State, Props> {
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
		initializeTools(this)
	}
}

const epicMeMcpMount = EpicMeMCP.mount('/mcp', {
	binding: 'EPIC_ME_MCP_OBJECT',
})

// Default handler for non-MCP routes
const defaultHandler = {
	fetch: async (request: Request, env: Env) => {
		const url = new URL(request.url)
		if (url.pathname.endsWith('/authorize')) {
			try {
				const oauthReqInfo = await env.OAUTH_PROVIDER.parseAuthRequest(request)

				const client = await env.OAUTH_PROVIDER.lookupClient(
					oauthReqInfo.clientId,
				)
				if (!client) {
					return new Response('Invalid client', { status: 400 })
				}

				const db = await DB.getInstance(env)
				const grantUserId = crypto.randomUUID()
				const grantId = await db.createUnclaimedGrant(grantUserId)

				const result = await env.OAUTH_PROVIDER.completeAuthorization({
					request: oauthReqInfo,
					// Here's one of the hacks. We don't know who the user is yet since the token at
					// this point is unclaimed. But completeAuthorization expects a userId.
					// So we'll generate a random UUID as a temporary userId
					userId: grantUserId,
					props: { grantId, grantUserId },
					scope: ['full'],
					metadata: { grantDate: new Date().toISOString() },
				})

				// Redirect to the client with the authorization code
				return Response.redirect(result.redirectTo)
			} catch (error) {
				console.error('Authorization error:', error)
				return new Response(
					error instanceof Error ? error.message : 'Authorization failed',
					{ status: 400 },
				)
			}
		}

		// Default response for non-authorization requests
		return new Response('Not Found', { status: 404 })
	},
}

// Create OAuth provider instance
const oauthProvider = new OAuthProvider({
	apiRoute: '/mcp',
	// @ts-expect-error
	apiHandler: epicMeMcpMount,
	// @ts-expect-error
	defaultHandler,
	authorizeEndpoint: '/authorize',
	tokenEndpoint: '/oauth/token',
	clientRegistrationEndpoint: '/oauth/register',
})

export default {
	fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
		return oauthProvider.fetch(request, env, ctx)
	},
}
