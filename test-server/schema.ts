import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { ulid as generateUlid } from "ulid";
import { setCustomGraphQL } from "../src/index";

export const user = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateUlid())
    .notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  bio: text("bio"),
});

export const post = sqliteTable("post", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateUlid()),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: text("author_id")
    .notNull()
    .references(() => user.id),
  name: text("name"),
});

export const comment = sqliteTable("comment", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateUlid())
    .notNull(),
  text: text("text").notNull(),
  postId: text("post_id")
    .notNull()
    .references(() => post.id),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
});

export type ReactionTypes = "LIKE" | "DISLIKE";

export const reaction = sqliteTable("reaction", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateUlid())
    .notNull(),
  commentId: text("comment_id")
    .notNull()
    .references(() => comment.id),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  type: text("type").$type<ReactionTypes>().notNull(),
});

// One-to-one relation: each user has exactly one profile
export const userProfile = sqliteTable("user_profile", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateUlid())
    .notNull(),
  userId: text("user_id").notNull().unique(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  website: text("website"),
});

setCustomGraphQL(reaction, {
  type: {
    type: "ReactionType",
    description: "Type of reaction: LIKE or DISLIKE",
  },
});

export const userRelations = relations(user, ({ one, many }) => ({
  posts: many(post),
  comments: many(comment),
  profile: one(userProfile, {
    fields: [user.id],
    references: [userProfile.userId],
  }),
}));

export const postRelations = relations(post, ({ one, many }) => ({
  author: one(user, {
    fields: [post.authorId],
    references: [user.id],
  }),
  comments: many(comment),
}));

export const commentRelations = relations(comment, ({ one }) => ({
  post: one(post, {
    fields: [comment.postId],
    references: [post.id],
  }),
  user: one(user, {
    fields: [comment.userId],
    references: [user.id],
  }),
}));

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
}));
