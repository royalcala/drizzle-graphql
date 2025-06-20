// Simplest approach: Custom resolver that transforms the field
import { buildSchema } from 'drizzle-graphql'
import { GraphQLList, GraphQLString } from 'graphql'
import { db } from './database'

// Get the generated schema
const { schema, entities } = buildSchema(db)

// Option 1: Add field resolver to existing schema
// This modifies the existing PostsItem type to parse JSON
const PostsItemType = entities.types.PostsItem;

// Override the field resolver
PostsItemType.getFields().multimediaUrls.resolve = (parent) => {
    if (typeof parent.multimediaUrls === 'string') {
        try {
            const parsed = JSON.parse(parent.multimediaUrls);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return parent.multimediaUrls || [];
};

// Change the field type to array
PostsItemType.getFields().multimediaUrls.type = new GraphQLList(GraphQLString);

// Now your existing schema will return arrays for multimediaUrls
export { schema };
