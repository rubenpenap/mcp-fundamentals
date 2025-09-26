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

async function setupClient() {
	const EPIC_ME_DB_PATH = getTestDbPath()
	const dir = path.dirname(EPIC_ME_DB_PATH)
	await fs.mkdir(dir, { recursive: true })
	const client = new Client({
		name: 'EpicMeTester',
		version: '1.0.0',
	})
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

	// 🚨 Proactive check: Should have both create_entry and get_entry tools
	invariant(
		list.tools.length >= 2,
		'🚨 Should have both create_entry and get_entry tools for this exercise',
	)

	const createTool = list.tools.find((tool) =>
		tool.name.toLowerCase().includes('create'),
	)
	const getTool = list.tools.find((tool) =>
		tool.name.toLowerCase().includes('get'),
	)

	invariant(createTool, '🚨 No create_entry tool found')
	invariant(
		getTool,
		'🚨 No get_entry tool found - this exercise requires implementing get_entry tool',
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

test('Embedded Resource in Tool Response', async () => {
	await using setup = await setupClient()
	const { client } = setup
	// First create an entry to get
	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Embedded Resource Test',
			content: 'This entry should be returned as an embedded resource',
		},
	})

	try {
		const result = await client.callTool({
			name: 'get_entry',
			arguments: {
				id: 1,
			},
		})

		// 🚨 The key learning objective: Tool responses should include embedded resources
		// with type: 'resource' instead of just text content

		// Type guard for content array
		const content = result.content as Array<any>
		invariant(
			Array.isArray(content),
			'🚨 Tool response content must be an array',
		)

		// Check if response includes embedded resource content type
		const hasEmbeddedResource = content.some(
			(item: any) => item.type === 'resource',
		)

		if (!hasEmbeddedResource) {
			throw new Error(
				'Tool response should include embedded resource content type',
			)
		}

		// Find the embedded resource content
		const embeddedResource = content.find(
			(item: any) => item.type === 'resource',
		) as any

		// 🚨 Proactive checks: Embedded resource should have proper structure
		invariant(
			embeddedResource,
			'🚨 Tool response should include embedded resource content type',
		)
		invariant(
			embeddedResource.resource,
			'🚨 Embedded resource must have resource field',
		)
		invariant(
			embeddedResource.resource.uri,
			'🚨 Embedded resource must have uri field',
		)
		invariant(
			embeddedResource.resource.mimeType,
			'🚨 Embedded resource must have mimeType field',
		)
		invariant(
			embeddedResource.resource.text,
			'🚨 Embedded resource must have text field',
		)
		invariant(
			typeof embeddedResource.resource.uri === 'string',
			'🚨 Embedded resource uri must be a string',
		)
		invariant(
			embeddedResource.resource.uri.includes('entries'),
			'🚨 Embedded resource URI should reference an entry',
		)

		expect(embeddedResource).toEqual(
			expect.objectContaining({
				type: 'resource',
				resource: expect.objectContaining({
					uri: expect.stringMatching(/epicme:\/\/entries\/\d+/),
					mimeType: 'application/json',
					text: expect.any(String),
				}),
			}),
		)

		// 🚨 Proactive check: Embedded resource text should be valid JSON with entry data
		let entryData: any
		try {
			entryData = JSON.parse(embeddedResource.resource.text)
		} catch (error) {
			throw new Error('🚨 Embedded resource text must be valid JSON')
		}

		invariant(
			entryData.id,
			'🚨 Embedded entry resource should contain id field',
		)
		invariant(
			entryData.title,
			'🚨 Embedded entry resource should contain title field',
		)
		invariant(
			entryData.content,
			'🚨 Embedded entry resource should contain content field',
		)
	} catch (error) {
		console.error('🚨 Embedded resources not implemented in get_entry tool!')
		console.error(
			'🚨 This exercise teaches you how to embed resources in tool responses',
		)
		console.error('🚨 You need to:')
		console.error(
			'🚨   1. Implement a get_entry tool that takes an id parameter',
		)
		console.error(
			'🚨   2. Instead of returning just text, return content with type: "resource"',
		)
		console.error(
			'🚨   3. Include resource object with uri, mimeType, and text fields',
		)
		console.error(
			'🚨   4. The text field should contain the JSON representation of the entry',
		)
		console.error(
			'🚨 Example: { type: "resource", resource: { uri: "epicme://entries/1", mimeType: "application/json", text: "{\\"id\\": 1, ...}" } }',
		)
		throw new Error(
			`🚨 get_entry tool should return embedded resource content type. ${error}`,
		)
	}
})
