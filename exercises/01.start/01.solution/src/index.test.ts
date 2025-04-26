import { test, beforeEach, afterEach } from 'node:test'
import { invariant } from '@epic-web/invariant'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { z } from 'zod'

let client: Client

beforeEach(async () => {
	client = new Client({
		name: 'EpicMathTester',
		version: '1.0.0',
	})
	const transport = new StdioClientTransport({
		command: 'tsx',
		args: ['src/index.ts'],
	})
	await client.connect(transport)
})

afterEach(async () => {
	await client.transport?.close()
})

await test('Tool Definition', async (t) => {
	const list = await client.listTools()
	const [firstTool] = list.tools
	invariant(firstTool, '🚨 No tools found')

	const expectedToolFormatSchema = z.object({
		name: z.string().regex(/^add$/i),
		description: z.string().regex(/^add two numbers$/i),
		inputSchema: z.object({
			type: z.literal('object'),
			properties: z.object({
				firstNumber: z.object({
					type: z.literal('number'),
					description: z.string().regex(/first/i),
				}),
				secondNumber: z.object({
					type: z.literal('number'),
					description: z.string().regex(/second/i),
				}),
			}),
		}),
	})
	assertSchema(expectedToolFormatSchema, firstTool)
})

await test('Tool Call', async (t) => {
	const result = await client.callTool({
		name: 'add',
		arguments: {
			firstNumber: 1,
			secondNumber: 2,
		},
	})

	assertSchema(
		z.object({
			content: z.array(
				z.object({ type: z.literal('text'), text: z.string().regex(/3/) }),
			),
		}),
		result,
	)
})

// TODO: maybe there's a way within Zod to handle the error message so we can
// just use parse and let it throw its own error.
function assertSchema(
	schema: z.ZodSchema,
	value: unknown,
): asserts value is z.infer<typeof schema> {
	const result = schema.safeParse(value)
	if (!result.success) {
		console.error('🚨 The following value is invalid:')
		console.dir(value, { depth: 8, colors: true })
		throw result.error
	}
}
