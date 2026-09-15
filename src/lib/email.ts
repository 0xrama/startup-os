import { createHash } from "node:crypto";
import { Resend } from "resend";
import { DeliveryUncertainError } from "@/modules/notifications/delivery-error";

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
}) {
  const from = process.env.EMAIL_FROM;

  if (!from) throw new Error("EMAIL_FROM is not configured");

  if (process.env.SMTP_URL) {
    const { default: nodemailer } = await import("nodemailer");

    const url = new URL(process.env.SMTP_URL);

    if (!["smtp:", "smtps:"].includes(url.protocol))
      throw new Error("Invalid SMTP protocol");

    const transport = nodemailer.createTransport({
      host: url.hostname,
      port: Number(url.port) || (url.protocol === "smtps:" ? 465 : 587),
      secure: url.protocol === "smtps:",
      auth: url.username
        ? {
            user: decodeURIComponent(url.username),
            pass: decodeURIComponent(url.password),
          }
        : undefined,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
    });

    try {
      const messageId = `<${createHash("sha256").update(input.idempotencyKey).digest("hex")}@pax.local>`;

      await transport.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        messageId,
      });

      return { id: messageId };
    } catch {
      throw new DeliveryUncertainError("SMTP delivery outcome is unknown");
    } finally {
      transport.close();
    }
  }

  if (!process.env.RESEND_API_KEY)
    throw new Error("Configure SMTP_URL or RESEND_API_KEY");

  const result = await new Resend(process.env.RESEND_API_KEY).emails.send(
    {
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    },
    { idempotencyKey: input.idempotencyKey }
  );

  if (result.error) throw new Error("Email provider rejected the request");

  return { id: result.data?.id ?? null };
}

export async function sendReminderEmail(input: {
  to: string;
  subject: string;
  taskTitle: string;
  dueDate: string;
  llcName: string;
  idempotencyKey: string;
}) {
  return sendEmail({
    ...input,
    text: `${input.llcName}\n${input.taskTitle}\nDue: ${input.dueDate}\n\nReview the details in Pax. This is a reminder, not tax or legal advice.`,
  });
}
