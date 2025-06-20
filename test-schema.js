import { drizzle } from 'drizzle-orm/better-sqlite3';
import { text, sqliteTable, integer } from 'drizzle-orm/sqlite-core';
import { buildSchema } from './src/index.js';
import Database from 'better-sqlite3';

// Create a test schema
const TestTable = sqliteTable('test_table', {
  id: integer('id').primaryKey(),
  multimediaUrls: text('multimedia_urls', { mode: 'json' }).$type(),
  regularData: text('data', { mode: 'json' }).$type(),
  tags: text('tags', { mode: 'json' }).$type(), // should be detected as array
  config: text('config', { mode: 'json' }).$type(), // should be JSON object
});

try {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema: { TestTable } });
  
  const result = buildSchema(db);
  
  console.log('Generated Types:');
  console.log('================');
  
  // Print the GraphQL schema
  const schema = result.schema;
  const queryType = schema.getQueryType();
  const fields = queryType.getFields();
  
  Object.entries(fields).forEach(([name, field]) => {
    if (name.includes('test')) {
      console.log(`Query: ${name}`);
      console.log(`Type: ${field.type}`);
      console.log('---');
    }
  });
  
  const typeMap = schema.getTypeMap();
  Object.entries(typeMap).forEach(([name, type]) => {
    if (name.includes('Test') || name.includes('test')) {
      console.log(`Type: ${name}`);
      if ('getFields' in type) {
        const fields = type.getFields();
        Object.entries(fields).forEach(([fieldName, field]) => {
          console.log(`  ${fieldName}: ${field.type}`);
        });
      }
      console.log('---');
    }
  });
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}
