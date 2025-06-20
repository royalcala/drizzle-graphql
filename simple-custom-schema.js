// Simple example: Override just the multimediaUrls field
import { 
    GraphQLList, 
    GraphQLNonNull, 
    GraphQLObjectType, 
    GraphQLSchema, 
    GraphQLString 
} from 'graphql'
import { buildSchema } from 'drizzle-graphql'
import { db } from './database'

// Generate base entities
const { entities } = buildSchema(db)

// Create custom type with array field
const CustomPostType = new GraphQLObjectType({
    name: 'PostWithArrays',
    fields: {
        // Spread all existing fields
        ...entities.types.PostsItem.getFields(),
        
        // Override multimediaUrls to be an array
        multimediaUrls: {
            type: new GraphQLList(GraphQLString),
            description: 'Array of multimedia URLs',
            resolve: (parent) => {
                // Parse JSON string to array
                if (typeof parent.multimediaUrls === 'string') {
                    try {
                        const parsed = JSON.parse(parent.multimediaUrls);
                        return Array.isArray(parsed) ? parsed : [];
                    } catch {
                        return [];
                    }
                }
                return parent.multimediaUrls || [];
            }
        }
    }
});

// Custom schema with your modified type
const customSchema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'Query',
        fields: {
            // Custom query using your new type
            posts: {
                type: new GraphQLList(new GraphQLNonNull(CustomPostType)),
                args: entities.queries.posts.args, // Reuse existing filters
                resolve: entities.queries.posts.resolve // Reuse existing logic
            },
            
            postsSingle: {
                type: CustomPostType,
                args: entities.queries.postsSingle.args,
                resolve: entities.queries.postsSingle.resolve
            },
            
            // Keep other queries unchanged
            users: entities.queries.users,
        }
    }),
    
    mutation: new GraphQLObjectType({
        name: 'Mutation',
        fields: entities.mutations // Keep all mutations as-is
    }),
    
    types: [...Object.values(entities.types), ...Object.values(entities.inputs), CustomPostType]
});

export { customSchema };
