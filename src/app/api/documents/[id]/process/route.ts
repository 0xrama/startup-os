import { handleDocumentProcessing } from "@/lib/document-processing";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleDocumentProcessing(request, context);
}
