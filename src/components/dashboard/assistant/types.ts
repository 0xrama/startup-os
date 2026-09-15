export type Citation = {
  label: string;
  sourceType: "irs" | "state" | "user_document";
  sourceTitle: string;
  excerpt: string;
  page?: number;
  section?: string;
  documentId?: string;
  sourceUrl?: string;
  revision?: string;
};

export type ToolActivity = {
  id: string;
  name: string;
  status: "running" | "done";
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[] | null;
  // Present only on the optimistic assistant turn while it streams.
  activity?: ToolActivity[];
};

export type Conversation = {
  id: string;
  title: string | null;
  updatedAt: string;
};
