import fs from 'node:fs/promises'
import path from 'node:path'
import { invariant } from '@epic-web/invariant'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { test, beforeAll, afterAll, expect } from 'vitest'

let client: Client
const EPIC_ME_DB_PATH = `./test.ignored/db.${process.env.VITEST_WORKER_ID}.sqlite`

beforeAll(async () => {
	const dir = path.dirname(EPIC_ME_DB_PATH)
	await fs.mkdir(dir, { recursive: true })
	client = new Client({
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

test('Resource Link in Tool Response', async () => {
	await client.callTool({
		name: 'create_tag',
		arguments: {
			name: 'Linked Tag Test',
			description: 'This tag should be linked as a resource',
		},
	})

	const listResult = await client.callTool({
		name: 'list_tags',
		arguments: {},
	})

	const content = listResult.content as Array<any>
	invariant(Array.isArray(content), '🚨 Tool response content must be an array')

	const resourceLink = content.find(
		(item: any) =>
			item.type === 'resource_link' &&
			item.name === 'Linked Tag Test' &&
			item.uri &&
			item.uri.includes('tags'),
	) as any

	invariant(
		resourceLink,
		'🚨 Resource link for created tag not found in list_tags response',
	)
	invariant(resourceLink.uri, '🚨 Resource link must have uri field')
	invariant(resourceLink.name, '🚨 Resource link must have name field')
	invariant(
		typeof resourceLink.uri === 'string',
		'🚨 Resource link uri must be a string',
	)
	invariant(
		typeof resourceLink.name === 'string',
		'🚨 Resource link name must be a string',
	)
	invariant(
		resourceLink.uri.includes('tags'),
		'🚨 Resource link URI should reference the created tag',
	)

	expect(resourceLink).toEqual(
		expect.objectContaining({
			type: 'resource_link',
			uri: expect.stringMatching(/epicme:\/\/tags\/\d+/),
			name: expect.stringMatching(/Linked Tag Test/),
			description: expect.any(String),
			mimeType: expect.stringMatching(/application\/json/),
		}),
	)
})
