import { DeliveryUncertainError } from "@/modules/notifications/delivery-error";

const GRAPH_API_URL = "https://graph.facebook.com/v21.0";

export async function sendWhatsAppMessage({
  to,
  templateName,
  parameters,
}: {
  to: string;
  templateName: string;
  parameters: string[];
}) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;

  const response = await fetch(`${GRAPH_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: parameters.map((p) => ({
              type: "text",
              text: p,
            })),
          },
        ],
      },
    }),
  }).catch(() => {
    throw new DeliveryUncertainError("WhatsApp delivery outcome is unknown");
  });

  if (!response.ok) {
    throw new Error("WhatsApp provider rejected the request");
  }

  return response.json();
}
