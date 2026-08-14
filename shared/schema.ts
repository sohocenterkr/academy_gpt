import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const adminRoleEnum = pgEnum("admin_role", [
  "super_admin",
  "admin"
]);

export const adminStatusEnum = pgEnum("admin_status", [
  "active",
  "inactive",
  "locked"
]);

export const admins = pgTable(
  "admins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 254 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: adminRoleEnum("role").notNull().default("admin"),
    status: adminStatusEnum("status").notNull().default("active"),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", {
      withTimezone: true,
      mode: "date"
    }),
    lastLoginAt: timestamp("last_login_at", {
      withTimezone: true,
      mode: "date"
    }),
    passwordChangedAt: timestamp("password_changed_at", {
      withTimezone: true,
      mode: "date"
    }).notNull().defaultNow(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date"
    }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "date"
    })
  },
  (table) => [
    uniqueIndex("admins_email_unique").on(table.email),
    index("admins_status_idx").on(table.status),
    index("admins_deleted_at_idx").on(table.deletedAt)
  ]
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date"
    }).notNull(),
    lastSeenAt: timestamp("last_seen_at", {
      withTimezone: true,
      mode: "date"
    }).notNull().defaultNow(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
      mode: "date"
    })
  },
  (table) => [
    uniqueIndex("admin_sessions_token_hash_unique").on(table.tokenHash),
    index("admin_sessions_admin_id_idx").on(table.adminId),
    index("admin_sessions_expires_at_idx").on(table.expiresAt)
  ]
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date"
    }).notNull(),
    usedAt: timestamp("used_at", {
      withTimezone: true,
      mode: "date"
    }),
    requestedIp: varchar("requested_ip", { length: 64 }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("password_reset_tokens_hash_unique").on(table.tokenHash),
    index("password_reset_tokens_admin_id_idx").on(table.adminId),
    index("password_reset_tokens_expires_at_idx").on(table.expiresAt)
  ]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorAdminId: uuid("actor_admin_id").references(() => admins.id, {
      onDelete: "set null"
    }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: varchar("entity_id", { length: 100 }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    }).notNull().defaultNow()
  },
  (table) => [
    index("audit_logs_actor_admin_id_idx").on(table.actorAdminId),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_created_at_idx").on(table.createdAt)
  ]
);

export const schools = pgTable(
  "schools",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    nameNormalized: varchar("name_normalized", { length: 120 }).notNull(),
    region: varchar("region", { length: 120 }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").references(() => admins.id, {
      onDelete: "set null"
    }),
    updatedBy: uuid("updated_by").references(() => admins.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date"
    }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "date"
    })
  },
  (table) => [
    uniqueIndex("schools_active_name_unique")
      .on(table.nameNormalized)
      .where(sql`${table.isActive} = true AND ${table.deletedAt} IS NULL`),
    check("schools_sort_order_nonnegative", sql`${table.sortOrder} >= 0`),
    index("schools_active_sort_idx").on(table.isActive, table.sortOrder),
    index("schools_deleted_at_idx").on(table.deletedAt)
  ]
);

export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;

export const gradeLevels = pgTable(
  "grade_levels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    nameNormalized: varchar("name_normalized", { length: 80 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").references(() => admins.id, {
      onDelete: "set null"
    }),
    updatedBy: uuid("updated_by").references(() => admins.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date"
    }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "date"
    })
  },
  (table) => [
    uniqueIndex("grade_levels_active_name_unique")
      .on(table.nameNormalized)
      .where(sql`${table.isActive} = true AND ${table.deletedAt} IS NULL`),
    check("grade_levels_sort_order_nonnegative", sql`${table.sortOrder} >= 0`),
    index("grade_levels_active_sort_idx").on(
      table.isActive,
      table.sortOrder
    ),
    index("grade_levels_deleted_at_idx").on(table.deletedAt)
  ]
);

export type GradeLevel = typeof gradeLevels.$inferSelect;
export type NewGradeLevel = typeof gradeLevels.$inferInsert;

export const academySettings = pgTable(
  "academy_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    singletonKey: integer("singleton_key").notNull().default(1),
    academyName: varchar("academy_name", { length: 150 }).notNull(),
    phoneNormalized: varchar("phone_normalized", { length: 20 }).notNull(),
    address: text("address").notNull(),
    logoMediaId: uuid("logo_media_id"),
    senderName: varchar("sender_name", { length: 100 }).notNull(),
    brandColors: jsonb("brand_colors")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    brandFonts: jsonb("brand_fonts")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    updatedBy: uuid("updated_by").references(() => admins.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date"
    }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("academy_settings_singleton_unique").on(table.singletonKey),
    check(
      "academy_settings_singleton_key_check",
      sql`${table.singletonKey} = 1`
    ),
    index("academy_settings_updated_at_idx").on(table.updatedAt)
  ]
);

export type AcademySettings = typeof academySettings.$inferSelect;
export type NewAcademySettings = typeof academySettings.$inferInsert;

export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
export type AdminSession = typeof adminSessions.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
