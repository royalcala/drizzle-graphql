import { text } from 'drizzle-orm/sqlite-core';
import { drizzleColumnToGraphQLType } from './src/util/type-converter/index.js';

const multimediaUrlsCol = text('multimedia_urls', { mode: 'json' }).$type();
const regularJsonCol = text('data', { mode: 'json' }).$type();

console.log('multimediaUrls column:');
console.log('dataType:', multimediaUrlsCol.config.dataType);
console.log('columnType:', multimediaUrlsCol.config.columnType);

try {
    const gqlType = drizzleColumnToGraphQLType(multimediaUrlsCol, 'multimedia_urls', 'testTable');
    console.log('GraphQL type:', gqlType.type.toString());
    console.log('Description:', gqlType.description);
} catch (e) {
    console.log('Error:', e.message);
}

console.log('\nregular data column:');
console.log('dataType:', regularJsonCol.config.dataType);
console.log('columnType:', regularJsonCol.config.columnType);

try {
    const gqlType = drizzleColumnToGraphQLType(regularJsonCol, 'data', 'testTable');
    console.log('GraphQL type:', gqlType.type.toString());
    console.log('Description:', gqlType.description);
} catch (e) {
    console.log('Error:', e.message);
}
