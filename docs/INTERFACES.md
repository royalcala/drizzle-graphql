# GraphQL Interfaces in Drizzle-GraphQL

## Overview

This library automatically generates GraphQL interfaces for each table in your Drizzle schema. These interfaces allow you to write reusable fragments that work across different GraphQL object types, reducing duplication and making your queries more maintainable.

## What Are GraphQL Interfaces?

GraphQL interfaces are abstract types that define a set of fields that multiple object types can implement. When an object type implements an interface, it guarantees that it will have all the fields defined in that interface.

In this library, every table generates:

- A `*Fields` interface containing all table columns
- A `*SelectItem` object type (with relations) implementing the interface
- A `*Item` object type (without relations) implementing the interface
- All relation object types (`*Relation`) also implement their respective table's interface

## Generated Types

For a table named `users`, the library generates:

```graphql
# Interface with all user table fields
interface UserFields {
  id: Int!
  name: String!
  email: String!
  createdAt: DateTime!
}

# Select type with relations (implements UserFields)
type UserSelectItem implements UserFields {
  id: Int!
  name: String!
  email: String!
  createdAt: DateTime!
  posts: [PostSelectItem!]! # Relations
  profile: ProfileSelectItem
}

# Item type without relations (implements UserFields)
type UserItem implements UserFields {
  id: Int!
  name: String!
  email: String!
  createdAt: DateTime!
}

# Relation types also implement the interface
type PostAuthorRelation implements UserFields {
  id: Int!
  name: String!
  email: String!
  createdAt: DateTime!
  # ... any relations from user
}
```

## Benefits of Using Interfaces

### 1. **Reusable Fragments**

Define a fragment once and use it across multiple types:

```graphql
fragment UserBaseFields on UserFields {
  id
  name
  email
  createdAt
}

query {
  users {
    ...UserBaseFields
    posts {
      title
    }
  }

  user(where: { id: { eq: 1 } }) {
    ...UserBaseFields # Same fragment works here
  }
}
```

### 2. **DRY (Don't Repeat Yourself)**

Without interfaces, you'd need separate fragments for each type:

```graphql
# Without interfaces - repetitive
fragment UserSelectFields on UserSelectItem {
  id
  name
  email
}

fragment UserItemFields on UserItem {
  id
  name
  email
}

# With interfaces - one fragment
fragment UserFields on UserFields {
  id
  name
  email
}
```

### 3. **Nested Relations**

Fragments work seamlessly with nested relations:

```graphql
fragment UserInfo on UserFields {
  id
  name
  email
}

fragment PostInfo on PostFields {
  id
  title
  content
}

query {
  posts {
    ...PostInfo
    author {
      ...UserInfo # Works on the relation type too!
    }
    comments {
      text
      user {
        ...UserInfo # And here as well!
      }
    }
  }
}
```

## How It Works Internally

### Fragment Resolution

When you use a fragment on an interface, GraphQL structures the query differently than direct field selection.

**Direct field selection:**

```graphql
query {
  users {
    id
    name
    email
  }
}
```

Internal tree structure:

```javascript
{
  id: { name: "id", ... },
  name: { name: "name", ... },
  email: { name: "email", ... }
}
```

**With interface fragment:**

```graphql
query {
  users {
    ...UserFragment
  }
}

fragment UserFragment on UserFields {
  id
  name
  email
}
```

Internal tree structure:

```javascript
{
  users: {
    fieldsByTypeName: {
      "UserFields": {
        id: { name: "id", ... },
        name: { name: "name", ... },
        email: { name: "email", ... }
      },
      "UserSelectItem": {
        id: { name: "id", ... },
        name: { name: "name", ... },
        email: { name: "email", ... }
      }
    }
  }
}
```

The library's `extractSelectedColumnsFromTree` function handles both cases:

1. Checks for direct field selection (backward compatible)
2. If not found, looks inside `fieldsByTypeName` for interface types (ending with `"Fields"`)
3. Extracts all fields from the interface and adds them to the database query

This ensures that fields requested through interface fragments are properly fetched from the database.

## Practical Examples

### Example 1: Basic User Query with Interface

**Schema (Drizzle):**

```typescript
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Query:**

```graphql
fragment UserBaseInfo on UserFields {
  id
  name
  email
  createdAt
}

query GetAllUsers {
  users {
    ...UserBaseInfo
    bio
  }
}

query GetSingleUser {
  user(where: { id: { eq: 1 } }) {
    ...UserBaseInfo # Same fragment, different query
    bio
  }
}
```

### Example 2: Nested Relations

**Schema:**

```typescript
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));
```

**Query:**

```graphql
fragment UserInfo on UserFields {
  id
  name
  email
}

fragment PostInfo on PostFields {
  id
  title
  createdAt
}

fragment CommentInfo on CommentFields {
  id
  text
  createdAt
}

query GetPostsWithAuthorsAndComments {
  posts {
    ...PostInfo
    content
    author {
      ...UserInfo # Interface fragment on relation
    }
    comments {
      ...CommentInfo
      user {
        ...UserInfo # Nested interface fragment
      }
    }
  }
}
```

### Example 3: Mutations with Interface Fragments

```graphql
fragment UserInfo on UserFields {
  id
  name
  email
  createdAt
}

mutation CreateUser {
  insertIntoUsersSingle(
    values: {
      name: "John Doe"
      email: "john@example.com"
      bio: "Software Developer"
    }
  ) {
    ...UserInfo # Interface fragment on mutation result
    bio
  }
}

mutation UpdateUser {
  updateUsers(set: { name: "Jane Doe" }, where: { id: { eq: 1 } }) {
    ...UserInfo # Same fragment on update result
    bio
  }
}
```

### Example 4: Deep Nesting

```graphql
fragment UserCore on UserFields {
  id
  name
  email
}

fragment PostCore on PostFields {
  id
  title
  createdAt
}

fragment CommentCore on CommentFields {
  id
  text
  createdAt
}

query DeepNestedQuery {
  users(limit: 10) {
    ...UserCore
    posts {
      ...PostCore
      author {
        ...UserCore # Reused at different levels
      }
      comments {
        ...CommentCore
        user {
          ...UserCore # Even deeper nesting
          posts(limit: 5) {
            ...PostCore # Circular navigation works!
          }
        }
      }
    }
  }
}
```

### Example 5: Conditional Fields with Interfaces

```graphql
fragment UserBasic on UserFields {
  id
  name
}

fragment UserDetailed on UserFields {
  id
  name
  email
  bio
  createdAt
}

query GetUsers($detailed: Boolean!) {
  users {
    ...UserBasic
    ... @include(if: $detailed) {
      ...UserDetailed
    }
  }
}
```

## Best Practices

### 1. **Name Fragments Clearly**

Use descriptive names that indicate what the fragment contains:

```graphql
# Good
fragment UserPublicInfo on UserFields { ... }
fragment UserPrivateInfo on UserFields { ... }

# Avoid
fragment UserFrag1 on UserFields { ... }
fragment Data on UserFields { ... }
```

### 2. **Keep Fragments Focused**

Create small, reusable fragments for specific use cases:

```graphql
# Good - focused fragments
fragment UserIdentity on UserFields {
  id
  name
}

fragment UserContact on UserFields {
  email
  phone
}

# Less ideal - too broad
fragment UserEverything on UserFields {
  id
  name
  email
  phone
  bio
  createdAt
  updatedAt
}
```

### 3. **Compose Fragments**

Build larger fragments from smaller ones:

```graphql
fragment UserIdentity on UserFields {
  id
  name
}

fragment UserFull on UserFields {
  ...UserIdentity
  email
  bio
  createdAt
}
```

### 4. **Use Interfaces for Type Safety**

Interface fragments ensure type safety across different object types:

```graphql
# This fragment is guaranteed to work on any type
# that implements UserFields
fragment UserSafe on UserFields {
  id
  name
  email
}
```

### 5. **Consider Performance**

Only request fields you need:

```graphql
# Good - only necessary fields
fragment UserMinimal on UserFields {
  id
  name
}

# Potentially wasteful
fragment UserFull on UserFields {
  id
  name
  email
  bio
  createdAt
  updatedAt
  lastLoginAt
  avatarUrl
  preferences
}
```

## TypeScript Integration

When using with TypeScript and code generation tools like GraphQL Code Generator:

```typescript
import { graphql } from "./gql";

// Fragment is type-safe
const UserInfoFragment = graphql(`
  fragment UserInfo on UserFields {
    id
    name
    email
  }
`);

// Query using the fragment
const GetUsersQuery = graphql(`
  query GetUsers {
    users {
      ...UserInfo
      bio
    }
  }
`);

// TypeScript knows the exact shape
type UserData = {
  id: number;
  name: string;
  email: string;
  bio: string | null;
};
```

## Troubleshooting

### Issue: "Cannot return null for non-nullable field"

**Cause:** The field is not being selected from the database when using interface fragments.

**Solution:** Ensure you're using the latest version of this library with interface fragment support. The `extractSelectedColumnsFromTree` function has been updated to handle interface fragments.

### Issue: Fragment not applying to relation types

**Cause:** Older versions didn't apply interfaces to relation types.

**Solution:** Update to the latest version where all relation types (`*Relation`) also implement their table's interface.

### Issue: Fields not showing in query result

**Cause:** The field might not exist on the interface type.

**Solution:** Check that the field exists in your Drizzle table schema. Only table columns are included in the `*Fields` interface. Relation fields are only available on the concrete types like `*SelectItem`.

```graphql
# ✅ Works - table fields
fragment UserInfo on UserFields {
  id
  name
  email
}

# ❌ Doesn't work - relations not on interface
fragment UserWithRelations on UserFields {
  id
  name
  posts # Error: Field doesn't exist on UserFields
}

# ✅ Correct way - use concrete type for relations
fragment UserWithRelations on UserSelectItem {
  ...UserInfo
  posts {
    id
    title
  }
}
```

## Comparison: Before and After Interfaces

### Before (without interfaces)

```graphql
query GetPosts {
  posts {
    id
    title
    author {
      id
      name
      email
    }
    comments {
      text
      user {
        id
        name
        email
      }
    }
  }
}
```

### After (with interfaces)

```graphql
fragment UserInfo on UserFields {
  id
  name
  email
}

query GetPosts {
  posts {
    id
    title
    author {
      ...UserInfo
    }
    comments {
      text
      user {
        ...UserInfo
      }
    }
  }
}
```

The second version is:

- ✅ More maintainable
- ✅ Less repetitive
- ✅ Easier to update (change fragment once)
- ✅ Type-safe
- ✅ Self-documenting

## Conclusion

GraphQL interfaces in Drizzle-GraphQL provide a powerful way to write cleaner, more maintainable queries. By using interface fragments, you can:

1. Reduce code duplication
2. Improve type safety
3. Make queries easier to understand and maintain
4. Create reusable components in your client applications
5. Ensure consistency across your API usage

The library handles all the complexity internally, allowing you to focus on building great applications with clean, efficient GraphQL queries.
