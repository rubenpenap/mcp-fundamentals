import { invariant } from '@epic-web/invariant'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import {
	CreateMessageRequestSchema,
	type CreateMessageResult,
} from '@modelcontextprotocol/sdk/types.js'
import { test, beforeAll, afterAll, expect } from 'vitest'
import { type z } from 'zod'

let client: Client

beforeAll(async () => {
	client = new Client(
		{
			name: 'EpicMeTester',
			version: '1.0.0',
		},
		{
			capabilities: {
				sampling: {},
			},
		},
	)
	const transport = new StdioClientTransport({
		command: 'tsx',
		args: ['src/index.ts'],
	})
	await client.connect(transport)
})

afterAll(async () => {
	await client.transport?.close()
})

test('Tool Definition', async () => {
	const list = await client.listTools()
	const [firstTool] = list.tools
	invariant(firstTool, '🚨 No tools found')

	expect(firstTool).toEqual(
		expect.objectContaining({
			name: expect.stringMatching(/^create_entry$/i),
			description: expect.stringMatching(/^create a new journal entry$/i),
			inputSchema: expect.objectContaining({
				type: 'object',
				properties: expect.objectContaining({
					title: expect.objectContaining({
						type: 'string',
						description: expect.stringMatching(/title/i),
					}),
					content: expect.objectContaining({
						type: 'string',
						description: expect.stringMatching(/content/i),
					}),
				}),
			}),
		}),
	)
})

test('Tool Call', async () => {
	const result = await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Test Entry',
			content: 'This is a test entry',
		},
	})

	expect(result).toEqual(
		expect.objectContaining({
			content: expect.arrayContaining([
				expect.objectContaining({
					type: 'text',
					text: expect.stringMatching(
						/Entry "Test Entry" created successfully/,
					),
				}),
			]),
		}),
	)
})

async function deferred<ResolvedValue>() {
	const ref = {} as {
		promise: Promise<ResolvedValue>
		resolve: (value: ResolvedValue) => void
		reject: (reason?: any) => void
		value: ResolvedValue | undefined
		reason: any | undefined
	}
	ref.promise = new Promise<ResolvedValue>((resolve, reject) => {
		ref.resolve = (value) => {
			ref.value = value
			resolve(value)
		}
		ref.reject = (reason) => {
			ref.reason = reason
			reject(reason)
		}
	})

	return ref
}

test('Sampling', async () => {
	const messageResultDeferred = await deferred<CreateMessageResult>()
	const messageRequestDeferred =
		await deferred<z.infer<typeof CreateMessageRequestSchema>>()

	client.setRequestHandler(CreateMessageRequestSchema, (r) => {
		messageRequestDeferred.resolve(r)
		return messageResultDeferred.promise
	})

	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Test Entry',
			content: 'This is a test entry',
		},
	})
	const request = await messageRequestDeferred.promise

	expect(request).toEqual(
		expect.objectContaining({
			method: 'sampling/createMessage',
			params: expect.objectContaining({
				maxTokens: expect.any(Number),
				systemPrompt: expect.stringMatching(/example/i),
				messages: expect.arrayContaining([
					expect.objectContaining({
						role: 'user',
						content: expect.objectContaining({
							type: 'text',
							text: expect.stringMatching(/entry/i),
							mimeType: 'application/json',
						}),
					}),
				]),
			}),
		}),
	)

	messageResultDeferred.resolve({
		model: 'stub-model',
		stopReason: 'endTurn',
		role: 'assistant',
		content: {
			type: 'text',
			text: JSON.stringify([
				{ id: 1 },
				{
					name: 'Testing Sampling',
					description: 'Used when testing sampling. Hope it works',
				},
			]),
		},
	})

	// give the client a chance to process the result
	await new Promise((resolve) => setTimeout(resolve, 100))
})
