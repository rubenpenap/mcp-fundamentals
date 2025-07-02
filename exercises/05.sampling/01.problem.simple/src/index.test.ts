import fs from 'node:fs/promises'
import path from 'node:path'
import { invariant } from '@epic-web/invariant'
import { faker } from '@faker-js/faker'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import {
	CreateMessageRequestSchema,
	type CreateMessageResult,
} from '@modelcontextprotocol/sdk/types.js'
import { test, beforeAll, afterAll, expect } from 'vitest'
import { type z } from 'zod'

let client: Client
const EPIC_ME_DB_PATH = `./test.ignored/db.${process.env.VITEST_WORKER_ID}.sqlite`

beforeAll(async () => {
	const dir = path.dirname(EPIC_ME_DB_PATH)
	await fs.mkdir(dir, { recursive: true })
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
		env: {
			...process.env,
			EPIC_ME_DB_PATH,
		},
	})
	await client.connect(transport)
})

afterAll(async () => {
	await client.transport?.close()
	await fs.unlink(EPIC_ME_DB_PATH)
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

	try {
		const entry = {
			title: faker.lorem.words(3),
			content: faker.lorem.paragraphs(2),
		}
		await client.callTool({
			name: 'create_entry',
			arguments: entry,
		})

		// Add a timeout wrapper to detect if sampling isn't working
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => {
				reject(
					new Error(
						'🚨 Sampling timeout - server did not send a sampling request',
					),
				)
			}, 3000) // Shorter timeout for better UX
		})

		const request = await Promise.race([
			messageRequestDeferred.promise,
			timeoutPromise,
		])

		expect(request).toEqual(
			expect.objectContaining({
				method: 'sampling/createMessage',
				params: expect.objectContaining({
					maxTokens: expect.any(Number),
					systemPrompt: expect.any(String),
					messages: expect.arrayContaining([
						expect.objectContaining({
							role: 'user',
							content: expect.objectContaining({
								type: 'text',
								text: expect.any(String),
								mimeType: 'text/plain',
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
				text: 'Congratulations!',
			},
		})

		// give the server a chance to process the result
		await new Promise((resolve) => setTimeout(resolve, 100))
	} catch (error: any) {
		if (
			error.message?.includes('Sampling timeout') ||
			error.message?.includes('Test timed out')
		) {
			console.error('🚨 Sampling capability not implemented!')
			console.error(
				'🚨 This exercise requires you to trigger a sampling (completion) request to the LLM when a new journal entry is created.',
			)
			console.error('🚨 You need to:')
			console.error(
				'🚨   1. Implement a function that sends a sampling request using agent.server.server.createMessage after creating a journal entry.',
			)
			console.error(
				'🚨   2. Use a simple system prompt (e.g., "You are a helpful assistant.") and a user message referencing the new entry\'s ID.',
			)
			console.error(
				'🚨   3. Set a reasonable maxTokens value for the response.',
			)
			console.error(
				"🚨   4. Log the result to the console so you can inspect the model's output.",
			)
			console.error(
				'🚨 Check that your tool implementation includes a call to agent.server.server.createMessage after creating an entry.',
			)
			const enhancedError = new Error(
				'🚨 Sampling capability required. Tool should send LLM requests after creating entries. ' +
					(error.message || error),
			)
			enhancedError.stack = error.stack
			throw enhancedError
		}
		throw error
	}
}, 10000) // Increase overall test timeout
