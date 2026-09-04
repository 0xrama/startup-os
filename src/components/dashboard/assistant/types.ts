export type Citation = {
  label: string;
  sourceType: "irs" | "state" | "user_document";
  sourceTitle: string;
  excerpt: string;
  page?: number;
  section?: string;
  documentId?: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[] | null;
};

export type Conversation = {
  id: string;
  title: string | null;
  updatedAt: string;
};
