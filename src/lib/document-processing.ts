import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { documents } from "./schema";
import { enqueueDocumentAnalysis } from "@/modules/documents/lifecycle";
import { requireApiContext, requireApiLlcAccess } from "./route-guards";
import { DOCUMENT_MAX_BYTES } from "./ai-limits";

export const documentProcessingServices = {
  requireApiContext,
  requireApiLlcAccess,
  processDocumentIntelligence: enqueueDocumentAnalysis,
  findDocument: (id: string) =>
    db.query.documents.findFirst({ where: eq(documents.id, id) }),
};

export async function handleDocumentProcessing(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
  services = documentProcessingServices
) {
  const {
    requireApiContext,
    requireApiLlcAccess,
    processDocumentIntelligence,
    findDocument,
  } = services;

  try {
    const context = await requireApiContext();

    if ("response" in context) return context.response;
    const { id } = await params;
    const document = await findDocument(id);

    if (!document)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const access = await requireApiLlcAccess(
      context.session.user.id,
      document.llcId
    );

    if ("response" in access) return access.response;

    let readableFile: File | undefined;

    if (
      request.headers.get("content-type")?.startsWith("multipart/form-data")
    ) {
      const maxBodyBytes = DOCUMENT_MAX_BYTES + 64 * 1024;

      if (Number(request.headers.get("content-length")) > maxBodyBytes) {
        return NextResponse.json(
          { error: "File too large (max 25 MB)" },
          { status: 413 }
        );
      }

      let received = 0;

      const body = request.body?.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            received += chunk.byteLength;

            if (received > maxBodyBytes) throw new Error("BODY_TOO_LARGE");
            controller.enqueue(chunk);
          },
        })
      );

      const form = await new Response(body, {
        headers: request.headers,
      }).formData();

      const file = form.get("file");

      if (
        form.get("consent") !== "true" ||
        !(file instanceof File) ||
        !file.size
      ) {
        return NextResponse.json(
          { error: "A file and analysis consent are required" },
          { status: 400 }
        );
      }

      if (file.size > DOCUMENT_MAX_BYTES) {
        return NextResponse.json(
          { error: "File too large (max 25 MB)" },
          { status: 413 }
        );
      }

      readableFile = file;
    } else {
      const body = await request.json().catch(() => null);

      if (body?.consent !== true) {
        return NextResponse.json(
          { error: "Analysis consent is required" },
          { status: 400 }
        );
      }
    }

    const result = await processDocumentIntelligence(id, readableFile);

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    const oversized =
      error instanceof Error && error.message === "BODY_TOO_LARGE";

    return NextResponse.json(
      {
        error: oversized
          ? "File too large (max 25 MB)"
          : "Analysis failed. Check the file format and AI provider, then retry.",
      },
      { status: oversized ? 413 : 500 }
    );
  }
}
