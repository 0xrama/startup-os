import { NextRequest } from "next/server";
import { handleAssistantChat } from "@/lib/assistant-chat";

export async function POST(request: NextRequest) {
  return handleAssistantChat(request);
}
