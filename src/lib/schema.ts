import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import type { JsonValue } from "./json";

const nextId = () => crypto.randomUUID();

/** Roles stored for chat messages. */
export type ChatRole = "user" | "assistant";

/** JSON object contract for audit log metadata. */
export type AuditMetadata = { [key: string]: JsonValue };

// ─── Better Auth tables ──────────────────────────────────────────
// Better Auth auto-creates: user, session, account, verification
// We extend the user table with additional columns via Better Auth config.
// The tables below reference user.id as text.

export const user = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").default(false),
  image: text("image"),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").default(false),
  whatsappOptedIn: boolean("whatsapp_opted_in").default(false),
  timezone: text("timezone").default("UTC"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const session = pgTable("session", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── LLCs ────────────────────────────────────────────────────────

export const llcs = pgTable("llcs", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  state: text("state").notNull(),
  entityType: text("entity_type").notNull(),
  ownerResidency: text("owner_residency").default("non_us"),
  formationDate: text("formation_date"),
  ein: text("ein"),
  einStatus: text("ein_status").default("pending"),
  taxYearEnd: text("tax_year_end").default("12-31"),
  taxClassification: text("tax_classification"),
  registeredAgent: text("registered_agent"),
  raRenewalDate: text("ra_renewal_date"),
  annualReportMonth: integer("annual_report_month"),
  members:
    jsonb("members").$type<
      {
        name: string;
        ownershipPct: number;
        country: string;
        taxIdType: string;
      }[]
    >(),
  filingPreferences: jsonb("filing_preferences").$type<{
    remindDaysBefore: number;
    channels: ("email" | "whatsapp")[];
    checklists?: {
      first30Days?: Record<string, boolean>;
    };
  }>(),
  encryptedData: jsonb("encrypted_data").$type<{
    version: 1;
    iv: string;
    ciphertext: string;
  } | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Documents ───────────────────────────────────────────────────

export const documents = pgTable("documents", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  llcId: text("llc_id")
    .notNull()
    .references(() => llcs.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  fileKey: text("file_key").notNull(),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  category: text("category"),
  documentType: text("document_type"),
  taxYear: integer("tax_year"),
  description: text("description"),
  scanStatus: text("scan_status").default("pending"),
  processingStatus: text("processing_status").default("pending"),
  processingError: text("processing_error"),
  extractedTextStatus: text("extracted_text_status").default("pending"),
  extractedMetadata: jsonb("extracted_metadata").$type<{
    summary?: string;
    textPreview?: string;
    issuer?: string;
    noticeNumber?: string;
    dueDate?: string;
    amountDue?: string;
    taxYear?: number;
    entityName?: string;
    state?: string;
    issueDate?: string;
    formName?: string;
    members?: string[];
    classificationConfidence?: number;
    extractedText?: string;
  } | null>(),
  encryptedMetadata: jsonb("encrypted_metadata").$type<{
    version: 1;
    iv: string;
    ciphertext: string;
  } | null>(),
  fileIv: text("file_iv"),
  wrappedFileKey: jsonb("wrapped_file_key").$type<{
    version: 1;
    iv: string;
    ciphertext: string;
  } | null>(),
  encryptionVersion: integer("encryption_version").default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userEncryption = pgTable("user_encryption", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  userId: text("user_id").notNull().unique(),
  pinWrappedMasterKey: jsonb("pin_wrapped_master_key").$type<{
    version: 1;
    salt: string;
    iv: string;
    ciphertext: string;
  }>(),
  recoveryWrappedMasterKey: jsonb("recovery_wrapped_master_key").$type<{
    version: 1;
    salt: string;
    iv: string;
    ciphertext: string;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Compliance Tasks ────────────────────────────────────────────

export const complianceTasks = pgTable("compliance_tasks", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  llcId: text("llc_id")
    .notNull()
    .references(() => llcs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  dueDate: text("due_date").notNull(),
  status: text("status").default("upcoming"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  recurring: boolean("recurring").default(false),
  recurrenceRule: text("recurrence_rule"),
  source: text("source").default("system"),
  metadata: jsonb("metadata").$type<{
    filingCode?: string;
    filingYear?: number;
    optional?: boolean;
    applicable?: boolean;
    optionalPrompt?: string;
    checklist?: {
      id: string;
      label: string;
      done?: boolean;
    }[];
    filing?: {
      filedAt?: string | null;
      filedMethod?:
        | "fax"
        | "mail"
        | "online"
        | "e-file"
        | "phone"
        | "manual"
        | "other"
        | null;
      acknowledgementStatus?: "received" | "pending" | "not_available" | null;
      acknowledgementReference?: string | null;
      notes?: string | null;
    };
  } | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Reminders ───────────────────────────────────────────────────

export const reminders = pgTable("reminders", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  taskId: text("task_id")
    .notNull()
    .references(() => complianceTasks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  channel: text("channel").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  status: text("status").default("pending"),
  messageId: text("message_id"),
  idempotencyKey: text("idempotency_key"),
  attemptCount: integer("attempt_count").default(0),
  lastError: text("last_error"),
  processingStartedAt: timestamp("processing_started_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Chat ────────────────────────────────────────────────────────

export const chatConversations = pgTable("chat_conversations", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  llcId: text("llc_id").references(() => llcs.id, { onDelete: "set null" }),
  userId: text("user_id").notNull(),
  title: text("title"),
  lastMessageAt: timestamp("last_message_at", {
    withTimezone: true,
  }).defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => chatConversations.id, { onDelete: "cascade" }),
  role: text("role").$type<ChatRole>().notNull(),
  requestId: text("request_id"),
  model: text("model"),
  finishReason: text("finish_reason"),
  content: text("content"),
  toolCalls: jsonb("tool_calls"),
  toolResults: jsonb("tool_results"),
  citations: jsonb("citations").$type<
    {
      label: string;
      sourceType: "irs" | "state" | "user_document";
      sourceTitle: string;
      excerpt: string;
      page?: number;
      section?: string;
      documentId?: string;
    }[]
  >(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Knowledge Chunks (RAG — future) ────────────────────────────

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  source: text("source").notNull(),
  sourceId: text("source_id"),
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<{
    kind?: "irs" | "state" | "user_document";
    title?: string;
    page?: number;
    section?: string;
    taxYear?: number;
    state?: string;
    form?: string;
    documentId?: string;
    llcId?: string;
    effectiveDate?: string;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── App Settings ────────────────────────────────────────────────

export const appSettings = pgTable("app_settings", {
  id: text("id")
    .primaryKey()
    .$default(() => "singleton"),
  aiBaseUrl: text("ai_base_url"),
  aiApiKey: text("ai_api_key"),
  aiModel: text("ai_model"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const noticeCases = pgTable("notice_cases", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  llcId: text("llc_id")
    .notNull()
    .references(() => llcs.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("processing"),
  issuer: text("issuer"),
  noticeType: text("notice_type"),
  taxYear: integer("tax_year"),
  responseDueDate: text("response_due_date"),
  summary: text("summary"),
  riskLevel: text("risk_level"),
  structuredData: jsonb("structured_data").$type<JsonValue | null>(),
  draftTaskPayload: jsonb("draft_task_payload").$type<{
    title?: string;
    description?: string;
    dueDate?: string;
    category?: string;
    reminders?: { offsetDays: number; channel: "email" | "whatsapp" }[];
  } | null>(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Audit Logs ──────────────────────────────────────────────────

export const auditLogs = pgTable("audit_logs", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  userId: text("user_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  metadata: jsonb("metadata").$type<AuditMetadata | null>(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
