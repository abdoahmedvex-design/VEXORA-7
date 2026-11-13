import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export type StoredOrderItem = {
  productId: number;
  productNameAr: string;
  productNameEn: string;
  packageAr: string;
  packageEn: string;
  unitPrice: number;
  quantity: number;
  playerId?: string;
  image: string;
};

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 24 }).unique(),
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: text("password_hash"),
  points: integer("points").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    number: varchar("number", { length: 24 }).notNull().unique(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    customerName: varchar("customer_name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 24 }).notNull(),
    email: varchar("email", { length: 255 }),
    paymentMethod: varchar("payment_method", { length: 40 }).notNull(),
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull().default(0),
    discountCode: varchar("discount_code", { length: 40 }),
    pointsUsed: integer("points_used").notNull().default(0),
    total: integer("total").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("received"),
    items: jsonb("items").$type<StoredOrderItem[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("orders_phone_idx").on(table.phone),
    index("orders_created_at_idx").on(table.createdAt),
    index("orders_user_id_idx").on(table.userId),
  ],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("order_events_order_id_idx").on(table.orderId)],
);

export const pointsLedger = pgTable(
  "points_ledger",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    delta: integer("delta").notNull(),
    reason: varchar("reason", { length: 24 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("points_ledger_user_idx").on(table.userId),
    uniqueIndex("points_ledger_order_reason_uq").on(table.orderId, table.reason),
  ],
);

export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
