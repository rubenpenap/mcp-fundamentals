/// <reference path="../../types/worker-configuration.d.ts" />

import { sql } from './utils.ts'

// Define migrations with version numbers
const migrations = [
	{
		version: 1,
		name: 'initial_schema',
		up: async (db: D1Database) => {
			console.log('Starting initial schema migration...')
			try {
				await db.batch([
					db.prepare(sql`
						CREATE TABLE IF NOT EXISTS schema_versions (
							version INTEGER PRIMARY KEY,
							name TEXT NOT NULL,
							applied_at INTEGER DEFAULT (CURRENT_TIMESTAMP) NOT NULL
						);
					`),
					db.prepare(sql`
						CREATE TABLE IF NOT EXISTS entries (
							id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
							title text NOT NULL,
							content text NOT NULL,
							mood text,
							location text,
							weather text,
							is_private integer DEFAULT true NOT NULL,
							is_favorite integer DEFAULT false NOT NULL,
							created_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							updated_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
						);
					`),
					db.prepare(sql`
						CREATE TABLE IF NOT EXISTS tags (
							id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
							name text NOT NULL UNIQUE,
							description text,
							created_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							updated_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
						);
					`),
					db.prepare(sql`
						CREATE TABLE IF NOT EXISTS entry_tags (
							id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
							entry_id integer NOT NULL,
							tag_id integer NOT NULL,
							created_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							updated_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							FOREIGN KEY (entry_id) REFERENCES entries(id) ON UPDATE no action ON DELETE no action,
							FOREIGN KEY (tag_id) REFERENCES tags(id) ON UPDATE no action ON DELETE no action
						);
					`),
				])
				console.log('Successfully created all tables')
			} catch (error) {
				console.error('Error in initial schema migration:', error)
				throw error
			}
		},
	},
	// Add future migrations here with incrementing version numbers
]

// Run migrations
export async function migrate(db: D1Database) {
	console.log('Starting migration process...')
	try {
		// Create schema_versions table if it doesn't exist (this is our first run)
		await db.exec(sql`
			CREATE TABLE IF NOT EXISTS schema_versions (
				version INTEGER PRIMARY KEY,
				name TEXT NOT NULL,
				applied_at INTEGER DEFAULT (CURRENT_TIMESTAMP) NOT NULL
			);
		`)
		console.log('Schema versions table ready')

		// Get the current version
		const result = await db
			.prepare(sql`SELECT MAX(version) as version FROM schema_versions;`)
			.first<{ version: number | null }>()

		const currentVersion = result?.version ?? 0
		console.log('Current schema version:', currentVersion)

		// Run any migrations that haven't been applied yet
		for (const migration of migrations) {
			if (migration.version > currentVersion) {
				console.log(`Running migration ${migration.version}: ${migration.name}`)
				await migration.up(db)
				await db
					.prepare(
						sql`INSERT INTO schema_versions (version, name) VALUES (?, ?);`,
					)
					.bind(migration.version, migration.name)
					.run()
				console.log(`Completed migration ${migration.version}`)
			}
		}
		console.log('Migration process completed successfully')
	} catch (error) {
		console.error('Error during migration process:', error)
		throw error
	}
}
