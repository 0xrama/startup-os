import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

const nextId = () => crypto.randomUUID();

// ─── Better Auth tables ──────────────────────────────────────────
// Better Auth auto-creates: user, session, account, verification
// We extend the user table with additional columns via Better Auth config.
// The tables below reference user.id as text.

export const user = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
  image: text("image"),
  phone: text("phone"),
  phoneVerified: integer("phone_verified", { mode: "boolean" }).default(false),
  whatsappOptedIn: integer("whatsapp_opted_in", { mode: "boolean" }).default(
    false
  ),
  timezone: text("timezone").default("UTC"),
  onboardingCompleted: integer("onboarding_completed", {
    mode: "boolean",
  }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

export const session = sqliteTable("session", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
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
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .defaultNow(),
});

export const verification = sqliteTable("verification", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

// ─── LLCs ────────────────────────────────────────────────────────

export const llcs = sqliteTable("llcs", {
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
  members: text("members", { mode: "json" }).$type<
    { name: string; ownershipPct: number; country: string; taxIdType: string }[]
  >(),
  filingPreferences: text("filing_preferences", { mode: "json" }).$type<{
    remindDaysBefore: number;
    channels: ("email" | "whatsapp")[];
    checklists?: {
      first30Days?: Record<string, boolean>;
    };
  }>(),
  encryptedData: text("encrypted_data", { mode: "json" }).$type<{
    version: 1;
    iv: string;
    ciphertext: string;
  } | null>(),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

// ─── Documents ───────────────────────────────────────────────────

export const documents = sqliteTable("documents", {
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
  extractedMetadata: text("extracted_metadata", { mode: "json" }).$type<{
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
  encryptedMetadata: text("encrypted_metadata", { mode: "json" }).$type<{
    version: 1;
    iv: string;
    ciphertext: string;
  } | null>(),
  fileIv: text("file_iv"),
  wrappedFileKey: text("wrapped_file_key", { mode: "json" }).$type<{
    version: 1;
    iv: string;
    ciphertext: string;
  } | null>(),
  encryptionVersion: integer("encryption_version").default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

export const userEncryption = sqliteTable("user_encryption", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  userId: text("user_id").notNull().unique(),
  pinWrappedMasterKey: text("pin_wrapped_master_key", { mode: "json" }).$type<{
    version: 1;
    salt: string;
    iv: string;
    ciphertext: string;
  }>(),
  recoveryWrappedMasterKey: text("recovery_wrapped_master_key", {
    mode: "json",
  }).$type<{
    version: 1;
    salt: string;
    iv: string;
    ciphertext: string;
  }>(),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

// ─── Compliance Tasks ────────────────────────────────────────────

export const complianceTasks = sqliteTable("compliance_tasks", {
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
  completedAt: integer("completed_at", { mode: "timestamp" }),
  recurring: integer("recurring", { mode: "boolean" }).default(false),
  recurrenceRule: text("recurrence_rule"),
  source: text("source").default("system"),
  metadata: text("metadata", { mode: "json" }).$type<{
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
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

// ─── Reminders ───────────────────────────────────────────────────

export const reminders = sqliteTable("reminders", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  taskId: text("task_id")
    .notNull()
    .references(() => complianceTasks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  channel: text("channel").notNull(),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }).notNull(),
  sentAt: integer("sent_at", { mode: "timestamp" }),
  status: text("status").default("pending"),
  messageId: text("message_id"),
  idempotencyKey: text("idempotency_key"),
  attemptCount: integer("attempt_count").default(0),
  lastError: text("last_error"),
  processingStartedAt: integer("processing_started_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

// ─── Chat ────────────────────────────────────────────────────────

export const chatConversations = sqliteTable("chat_conversations", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  llcId: text("llc_id").references(() => llcs.id, { onDelete: "set null" }),
  userId: text("user_id").notNull(),
  title: text("title"),
  lastMessageAt: integer("last_message_at", { mode: "timestamp" }).defaultNow(),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => chatConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  requestId: text("request_id"),
  model: text("model"),
  finishReason: text("finish_reason"),
  content: text("content"),
  toolCalls: text("tool_calls", { mode: "json" }),
  toolResults: text("tool_results", { mode: "json" }),
  citations: text("citations", { mode: "json" }).$type<
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
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

// ─── Knowledge Chunks (RAG — future) ────────────────────────────

export const knowledgeChunks = sqliteTable("knowledge_chunks", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  source: text("source").notNull(),
  sourceId: text("source_id"),
  content: text("content").notNull(),
  embedding: text("embedding", { mode: "json" }).$type<number[]>(),
  metadata: text("metadata", { mode: "json" }).$type<{
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
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

// ─── Subscriptions ───────────────────────────────────────────────

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  userId: text("user_id").notNull().unique(),
  polarCustomerId: text("polar_customer_id"),
  polarSubscriptionId: text("polar_subscription_id"),
  plan: text("plan"),
  status: text("status").default("expired"),
  currentPeriodStart: integer("current_period_start", {
    mode: "timestamp",
  }),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

export const llcCollaborators = sqliteTable("llc_collaborators", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  llcId: text("llc_id")
    .notNull()
    .references(() => llcs.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  userId: text("user_id"),
  role: text("role").notNull().default("viewer"),
  status: text("status").notNull().default("pending"),
  invitedBy: text("invited_by").notNull(),
  acceptedAt: integer("accepted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

export const noticeCases = sqliteTable("notice_cases", {
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
  structuredData: text("structured_data", { mode: "json" }).$type<Record<
    string,
    unknown
  > | null>(),
  draftTaskPayload: text("draft_task_payload", { mode: "json" }).$type<{
    title?: string;
    description?: string;
    dueDate?: string;
    category?: string;
    reminders?: { offsetDays: number; channel: "email" | "whatsapp" }[];
  } | null>(),
  confirmedAt: integer("confirmed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).defaultNow(),
});

// ─── Audit Logs ──────────────────────────────────────────────────

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id")
    .primaryKey()
    .$default(() => nextId()),
  userId: text("user_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  metadata: text("metadata", { mode: "json" }),
  ipAddress: text("ip_address"),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});
