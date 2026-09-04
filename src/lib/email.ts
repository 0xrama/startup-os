import { Resend } from "resend";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendReminderEmail({
  to,
  subject,
  taskTitle,
  dueDate,
  llcName,
}: {
  to: string;
  subject: string;
  taskTitle: string;
  dueDate: string;
  llcName: string;
}) {
  return getResend().emails.send({
    from: "Pax <reminders@startupos.com>",
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Upcoming Deadline</h2>
        <p>Hi there,</p>
        <p>This is a reminder for <strong>${llcName}</strong>:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600;">${taskTitle}</p>
          <p style="margin: 8px 0 0; color: #666;">Due: ${dueDate}</p>
        </div>
        <p>Log in to your Pax dashboard for full details and next steps.</p>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">
          This is an automated reminder from Pax. Not legal or tax advice.
        </p>
      </div>
    `,
  });
}
