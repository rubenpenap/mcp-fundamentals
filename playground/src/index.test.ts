import fs from 'node:fs/promises'
import path from 'node:path'
import { invariant } from '@epic-web/invariant'
import {
	Client,
	type ClientOptions,
} from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { test, expect } from 'vitest'

function getTestDbPath() {
	return `./test.ignored/db.${process.env.VITEST_WORKER_ID}.${Math.random().toString(36).slice(2)}.sqlite`
}

async function setupClient({ capabilities }: ClientOptions = {}) {
	const EPIC_ME_DB_PATH = getTestDbPath()
	const dir = path.dirname(EPIC_ME_DB_PATH)
	await fs.mkdir(dir, { recursive: true })
	const client = new Client(
		{
			name: 'EpicMeTester',
			version: '1.0.0',
		},
		{ capabilities },
	)
	const transport = new StdioClientTransport({
		command: 'tsx',
		args: ['src/index.ts'],
		env: {
			...process.env,
			EPIC_ME_DB_PATH,
		},
		stderr: 'ignore',
	})
	await client.connect(transport)
	return {
		client,
		EPIC_ME_DB_PATH,
		async [Symbol.asyncDispose]() {
			await client.transport?.close()
			// give things a moment to release locks and whatnot
			await new Promise((r) => setTimeout(r, 100))
			await fs.unlink(EPIC_ME_DB_PATH).catch(() => {}) // ignore missing file
		},
	}
}

test('Tool Definition', async () => {
	await using setup = await setupClient()
	const { client } = setup
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
	await using setup = await setupClient()
	const { client } = setup
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

test('Resource Template Completions', async () => {
	await using setup = await setupClient()
	const { client } = setup
	// First create some entries to have data for completion
	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Completion Test Entry 1',
			content: 'This is for testing completions',
		},
	})

	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Completion Test Entry 2',
			content: 'This is another completion test',
		},
	})

	// Test that resource templates exist
	const templates = await client.listResourceTemplates()

	// 🚨 Proactive check: Ensure resource templates are registered
	invariant(
		templates.resourceTemplates.length > 0,
		'🚨 No resource templates found - this exercise requires implementing resource templates',
	)

	const entriesTemplate = templates.resourceTemplates.find(
		(rt) => rt.uriTemplate.includes('entries') && rt.uriTemplate.includes('{'),
	)
	invariant(
		entriesTemplate,
		'🚨 No entries resource template found - should implement epicme://entries/{id} template',
	)

	// 🚨 The key learning objective for this exercise is adding completion support
	// This requires BOTH declaring completions capability AND implementing complete callbacks

	try {
		// Test completion functionality using the proper MCP SDK method
		const completionResult = await client.complete({
			ref: {
				type: 'ref/resource',
				uri: entriesTemplate.uriTemplate,
			},
			argument: {
				name: 'id',
				value: '1', // Should match at least one of our created entries
			},
		})

		// 🚨 Proactive check: Completion should return results
		invariant(
			Array.isArray(completionResult.completion?.values),
			'🚨 Completion should return an array of values',
		)
		invariant(
			completionResult.completion.values.length > 0,
			'🚨 Completion should return at least one matching result for id="1"',
		)

		// Check that completion values are strings
		completionResult.completion.values.forEach((value: any) => {
			invariant(
				typeof value === 'string',
				'🚨 Completion values should be strings',
			)
		})
	} catch (error: any) {
		console.error('🚨 Resource template completion not fully implemented!')
		console.error(
			'🚨 This exercise teaches you how to add completion support to resource templates',
		)
		console.error('🚨 You need to:')
		console.error('🚨   1. Add "completion" to your server capabilities')
		console.error('🚨   2. Add complete callback to your ResourceTemplate:')
		console.error(
			'🚨      complete: { async id(value) { return ["1", "2", "3"] } }',
		)
		console.error(
			'🚨   3. The complete callback should filter entries matching the partial value',
		)
		console.error('🚨   4. Return an array of valid completion strings')
		console.error(`🚨 Error details: ${error?.message || error}`)

		if (error?.code === -32601) {
			throw new Error(
				'🚨 Completion capability not declared - add "completion" to server capabilities and implement complete callbacks',
			)
		} else if (error?.code === -32602) {
			throw new Error(
				'🚨 Complete callback not implemented - add complete: { async id(value) { ... } } to your ResourceTemplate',
			)
		} else {
			throw new Error(
				`🚨 Resource template completion not working - check capability declaration and complete callback implementation. ${error}`,
			)
		}
	}
})
