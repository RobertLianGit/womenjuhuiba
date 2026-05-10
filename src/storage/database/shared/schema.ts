import { sql } from "drizzle-orm";
import { pgTable, varchar, text, timestamp, integer, boolean, numeric, index, serial } from "drizzle-orm/pg-core";

// 系统表 - 禁止删除
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 活动表
export const activities = pgTable(
  "activities",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    rough_time: varchar("rough_time", { length: 100 }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("created"),
    creator_id: varchar("creator_id", { length: 36 }).notNull(),
    creator_name: varchar("creator_name", { length: 100 }).notNull(),
    intention_deadline: timestamp("intention_deadline", { withTimezone: true }),
    passphrase: varchar("passphrase", { length: 50 }).notNull().default(''),
    vote_deadline: timestamp("vote_deadline", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("activities_creator_id_idx").on(table.creator_id),
    index("activities_status_idx").on(table.status),
    index("activities_created_at_idx").on(table.created_at),
  ]
);

// 活动分段表
export const scenes = pgTable(
  "scenes",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    activity_id: varchar("activity_id", { length: 36 }).notNull().references(() => activities.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    time_range: varchar("time_range", { length: 100 }),
    location: varchar("location", { length: 200 }),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("scenes_activity_id_idx").on(table.activity_id),
  ]
);

// 意愿表
export const intentions = pgTable(
  "intentions",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    activity_id: varchar("activity_id", { length: 36 }).notNull().references(() => activities.id, { onDelete: "cascade" }),
    user_id: varchar("user_id", { length: 36 }).notNull(),
    user_name: varchar("user_name", { length: 100 }).notNull(),
    wants: text("wants"),
    estimated_people: integer("estimated_people").default(1),
    selected_scenes: text("selected_scenes"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("intentions_activity_id_idx").on(table.activity_id),
    index("intentions_user_id_idx").on(table.user_id),
    index("intentions_activity_user_idx").on(table.activity_id, table.user_id),
  ]
);

// 投票方案表
export const voteProposals = pgTable(
  "vote_proposals",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    activity_id: varchar("activity_id", { length: 36 }).notNull().references(() => activities.id, { onDelete: "cascade" }),
    user_id: varchar("user_id", { length: 36 }).notNull(),
    user_name: varchar("user_name", { length: 100 }).notNull(),
    location: varchar("location", { length: 200 }).notNull(),
    activity_type: varchar("activity_type", { length: 200 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("vote_proposals_activity_id_idx").on(table.activity_id),
  ]
);

// 投票记录表
export const voteRecords = pgTable(
  "vote_records",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    activity_id: varchar("activity_id", { length: 36 }).notNull().references(() => activities.id, { onDelete: "cascade" }),
    user_id: varchar("user_id", { length: 36 }).notNull(),
    user_name: varchar("user_name", { length: 100 }).notNull(),
    voted_proposal_ids: text("voted_proposal_ids").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("vote_records_activity_id_idx").on(table.activity_id),
    index("vote_records_activity_user_idx").on(table.activity_id, table.user_id),
  ]
);

// 报名表
export const registrations = pgTable(
  "registrations",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    activity_id: varchar("activity_id", { length: 36 }).notNull().references(() => activities.id, { onDelete: "cascade" }),
    scene_id: varchar("scene_id", { length: 36 }).notNull().references(() => scenes.id, { onDelete: "cascade" }),
    user_id: varchar("user_id", { length: 36 }).notNull(),
    user_name: varchar("user_name", { length: 100 }).notNull(),
    people_count: integer("people_count").notNull().default(1),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("registrations_activity_id_idx").on(table.activity_id),
    index("registrations_scene_id_idx").on(table.scene_id),
    index("registrations_activity_user_idx").on(table.activity_id, table.user_id),
  ]
);

// 参与者看板表
export const participants = pgTable(
  "participants",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    activity_id: varchar("activity_id", { length: 36 }).notNull().references(() => activities.id, { onDelete: "cascade" }),
    scene_id: varchar("scene_id", { length: 36 }).notNull().references(() => scenes.id, { onDelete: "cascade" }),
    user_id: varchar("user_id", { length: 36 }),
    user_name: varchar("user_name", { length: 100 }).notNull(),
    people_count: integer("people_count").notNull().default(1),
    is_manual: boolean("is_manual").notNull().default(false),
    is_temp: boolean("is_temp").notNull().default(false),
    status: varchar("status", { length: 30 }).notNull().default("confirmed"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("participants_activity_id_idx").on(table.activity_id),
    index("participants_scene_id_idx").on(table.scene_id),
  ]
);

// 账单表
export const bills = pgTable(
  "bills",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    activity_id: varchar("activity_id", { length: 36 }).notNull().references(() => activities.id, { onDelete: "cascade" }),
    scene_id: varchar("scene_id", { length: 36 }).notNull().references(() => scenes.id, { onDelete: "cascade" }),
    total_amount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("bills_activity_id_idx").on(table.activity_id),
    index("bills_scene_id_idx").on(table.scene_id),
  ]
);

// 方案内容表
export const plans = pgTable(
  "plans",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    activity_id: varchar("activity_id", { length: 36 }).notNull().references(() => activities.id, { onDelete: "cascade" }),
    content: text("content"),
    prompt_generated: text("prompt_generated"),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("plans_activity_id_idx").on(table.activity_id),
  ]
);
