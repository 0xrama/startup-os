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

  const response = await fetch(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    {
      method: "POST",
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
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
  }

  return response.json();
}
