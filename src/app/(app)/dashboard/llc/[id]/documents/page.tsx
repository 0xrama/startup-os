"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  BadgeCheck,
  FolderOpen,
  Download,
  Landmark,
  Loader2,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useEncryption } from "@/components/security/encryption-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  decryptDocumentBlob,
  decryptJson,
  encryptDocumentBlob,
  encryptJson,
  type CipherPayload,
} from "@/lib/e2ee";
import { getDocumentIcon } from "@/lib/app-icons";

type Document = {
  id: string;
  name: string;
  fileType: string | null;
  fileSize: number | null;
  category: string | null;
  scanStatus: string | null;
  processingStatus?: string | null;
  extractedTextStatus?: string | null;
  extractedMetadata?: {
    summary?: string;
    issuer?: string;
    dueDate?: string;
    textPreview?: string;
  } | null;
  createdAt: string;
  encryptedMetadata?: CipherPayload | null;
  wrappedFileKey?: CipherPayload | null;
  fileIv?: string | null;
};

type BillingStatus = {
  limits?: {
    documentIntelligence: boolean;
    noticeTriage: boolean;
  };
};

type NoticeCase = {
  id: string;
  summary: string | null;
  issuer: string | null;
  responseDueDate: string | null;
  riskLevel: string | null;
  status: string;
};

const CATEGORIES = [
  {
    value: "operating_agreement",
    label: "Operating Agreement",
    icon: ScrollText,
  },
  { value: "ein_letter", label: "EIN Letter", icon: BadgeCheck },
  { value: "tax_return", label: "Tax Return", icon: ReceiptText },
  { value: "notice", label: "Notice", icon: Landmark },
  { value: "invoice", label: "Invoice", icon: ReceiptText },
  { value: "compliance", label: "Compliance Record", icon: ShieldCheck },
  { value: "other", label: "Other", icon: FolderOpen },
];

const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map((category) => [category.value, category.label])
) as Record<string, string>;

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { id: llcId } = useParams<{ id: string }>();
  const { masterKey, unlocked } = useEncryption();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState("other");
  const [notices, setNotices] = useState<NoticeCase[]>([]);
  const [documentIntelligenceEnabled, setDocumentIntelligenceEnabled] =
    useState(false);
  const [noticeTriageEnabled, setNoticeTriageEnabled] = useState(false);
  const [gateMessage, setGateMessage] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch(`/api/llcs/${llcId}/documents`);
      if (!res.ok) return;
      const data = (await res.json()) as Array<Document>;
      if (masterKey) {
        const decryptedDocs = await Promise.all(
          data.map(async (doc) => {
            if (!doc.encryptedMetadata) return doc;

            try {
              const metadata = await decryptJson<{
                fileName: string;
                fileType: string;
                fileSize: number;
                category: string;
              }>(masterKey, doc.encryptedMetadata);

              return {
                ...doc,
                name: metadata.fileName,
                fileType: metadata.fileType,
                fileSize: metadata.fileSize,
                category: metadata.category,
              };
            } catch {
              return {
                ...doc,
                name: "Unable to decrypt document",
              };
            }
          })
        );
        setDocs(decryptedDocs);
        return;
      }

      setDocs(data);
    } finally {
      setLoading(false);
    }
  }, [llcId, masterKey]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  useEffect(() => {
    void fetch(`/api/llcs/${llcId}/notices`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setNotices(data as NoticeCase[]))
      .catch(() => undefined);
  }, [llcId]);

  useEffect(() => {
    void fetch("/api/billing/status", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const status = data as BillingStatus | null;
        setDocumentIntelligenceEnabled(
          Boolean(status?.limits?.documentIntelligence)
        );
        setNoticeTriageEnabled(Boolean(status?.limits?.noticeTriage));
      })
      .catch(() => undefined);
  }, []);

  async function handleUpload() {
    if (!selectedFile || !masterKey) return;
    setUploading(true);

    try {
      setGateMessage(null);
      const encryptedFile = await encryptDocumentBlob(masterKey, selectedFile);
      const encryptedMetadata = await encryptJson(masterKey, {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        category,
      });

      // 1. Get presigned URL
      const presignRes = await fetch("/api/documents/presign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llcId,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          category,
          encryptedMetadata,
          wrappedFileKey: encryptedFile.wrappedFileKey,
          fileIv: encryptedFile.fileCiphertext.iv,
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error || "Failed to get upload URL");
      }

      const { uploadUrl, documentId } = await presignRes.json();

      // 2. Upload directly to R2
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: encryptedFile.encryptedBlob,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      if (documentIntelligenceEnabled) {
        const processRes = await fetch(`/api/documents/${documentId}/process`, {
          method: "POST",
        });

        if (!processRes.ok) {
          const processData = await processRes.json().catch(() => ({
            error: "Document processing is unavailable right now.",
          }));
          setGateMessage(
            processData.error ?? "Document processing is unavailable right now."
          );
        }
      }

      // 3. Add to list
      setDocs((prev) => [
        {
          id: documentId,
          name: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          category,
          scanStatus: "pending",
          processingStatus: "processing",
          extractedTextStatus: "processing",
          createdAt: new Date().toISOString(),
          encryptedMetadata,
          wrappedFileKey: encryptedFile.wrappedFileKey,
          fileIv: encryptedFile.fileCiphertext.iv,
        },
        ...prev,
      ]);

      setDialogOpen(false);
      setSelectedFile(null);
      setCategory("other");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc: Document) {
    if (!masterKey) return;

    const res = await fetch("/api/documents/presign-download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: doc.id }),
    });

    if (!res.ok) return;

    const {
      downloadUrl,
      wrappedFileKey,
      fileIv,
      encryptedMetadata,
      fileType,
      fileName,
    } = (await res.json()) as {
      downloadUrl: string;
      wrappedFileKey: CipherPayload | null;
      fileIv: string | null;
      encryptedMetadata: CipherPayload | null;
      fileType: string | null;
      fileName: string;
    };

    if (!wrappedFileKey || !fileIv) {
      window.open(downloadUrl, "_blank");
      return;
    }

    const encryptedBlobResponse = await fetch(downloadUrl);
    if (!encryptedBlobResponse.ok) throw new Error("Failed to download file");

    const decryptedBlob = await decryptDocumentBlob(
      masterKey,
      wrappedFileKey,
      fileIv,
      await encryptedBlobResponse.blob()
    );

    let resolvedName = fileName;
    let resolvedType = fileType ?? "application/octet-stream";

    if (encryptedMetadata) {
      const metadata = await decryptJson<{
        fileName: string;
        fileType: string;
        category?: string;
      }>(masterKey, encryptedMetadata);
      resolvedName = metadata.fileName;
      resolvedType = metadata.fileType;
    }

    const objectUrl = URL.createObjectURL(
      new Blob([decryptedBlob], { type: resolvedType })
    );
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = resolvedName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  async function handleDelete(docId: string) {
    if (!confirm("Delete this document?")) return;

    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    if (res.ok) {
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-serif text-3xl mb-1">Document Vault</h1>
          <p className="text-sm text-muted-foreground">
            Securely store and manage your LLC documents.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button size="sm" className="gap-2 btn-warm border-0" />}
          >
            <Upload className="h-4 w-4" />
            Upload
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="heading-serif text-xl">
                Upload document
              </DialogTitle>
              <DialogDescription>
                PDF, images, or Word documents up to 25 MB.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        className={`selection-card rounded-lg border px-3 py-1.5 text-xs transition-all ${
                          category === c.value
                            ? "border-primary bg-primary/5 font-medium text-primary shadow-sm"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" />
                          <span>{c.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading || !unlocked}
                className="btn-warm border-0"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  "Upload"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {gateMessage ? (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {gateMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : docs.length === 0 ? (
        <div className="card-warm p-12 text-center border border-dashed border-border group">
          <div className="icon-container mx-auto mb-4 w-fit bg-secondary rounded-xl p-3">
            <FolderOpen className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">No documents yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your operating agreement, EIN letter, or other LLC records.
            Files are encrypted before they leave your browser.
          </p>
          <Button
            size="sm"
            className="gap-2 btn-warm border-0"
            onClick={() => setDialogOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Upload your first document
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {notices.length > 0 ? (
            <div className="card-warm p-5">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="flex items-center gap-2 heading-serif text-xl">
                  <Landmark className="h-5 w-5 text-primary" />
                  Notice Triage
                </h2>
                {!noticeTriageEnabled ? (
                  <Badge variant="secondary" className="w-fit text-xs">
                    Pro only
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-3">
                {notices.map((notice) => (
                  <div
                    key={notice.id}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {notice.issuer || "Agency notice"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notice.summary || "Waiting for extracted summary."}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">
                          {notice.status}
                        </Badge>
                        {notice.responseDueDate ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Due {notice.responseDueDate}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {docs.map((doc) => {
              const Icon = getDocumentIcon(doc.fileType, doc.category);
              return (
                <div
                  key={doc.id}
                  className="card-warm p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="icon-container flex-shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-xs">
                          {doc.category
                            ? (CATEGORY_LABELS[doc.category] ?? doc.category)
                            : "Uncategorized"}
                        </Badge>
                        {doc.processingStatus ? (
                          <Badge variant="secondary" className="text-xs">
                            {doc.processingStatus}
                          </Badge>
                        ) : null}
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatSize(doc.fileSize)}
                        </span>
                      </div>
                      {doc.extractedMetadata?.summary ? (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {doc.extractedMetadata.summary}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!unlocked}
                      onClick={() => handleDownload(doc)}
                      className="hover:text-primary"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
