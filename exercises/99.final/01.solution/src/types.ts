export interface Env {
	EPIC_ME_DB: D1Database
	OAUTH_KV: KVNamespace
	OAUTH_PROVIDER: {
		parseAuthRequest(request: Request): Promise<any>
		lookupClient(clientId: string): Promise<any>
		completeAuthorization(options: {
			request: any
			userId: string
			props: Record<string, any>
			scope: string[]
			metadata?: Record<string, any>
		}): Promise<{ redirectTo: string }>
	}
}
