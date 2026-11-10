import { index, integer, jsonb, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

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

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    number: varchar("number", { length: 24 }).notNull().unique(),
    customerName: varchar("customer_name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 24 }).notNull(),
    email: varchar("email", { length: 255 }),
    paymentMethod: varchar("payment_method", { length: 40 }).notNull(),
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull().default(0),
    discountCode: varchar("discount_code", { length: 40 }),
    total: integer("total").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("received"),
    items: jsonb("items").$type<StoredOrderItem[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("orders_phone_idx").on(table.phone), index("orders_created_at_idx").on(table.createdAt)],
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
