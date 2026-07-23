import { z } from "zod";

const attachmentSchema = z.object({
  Name: z.string(),
  Content: z.string(),
  ContentType: z.string().optional(),
  ContentLength: z.number().optional(),
  ContentID: z.string().optional(),
});

const recipientSchema = z.object({
  Email: z.string(),
  Name: z.string().optional(),
  MailboxHash: z.string().optional(),
});

export const postmarkInboundSchema = z.object({
  From: z.string().optional(),
  FromName: z.string().optional(),
  To: z.string().optional(),
  OriginalRecipient: z.string().optional(),
  Subject: z.string().optional(),
  MessageID: z.string().optional(),
  TextBody: z.string().optional(),
  HtmlBody: z.string().optional(),
  ToFull: z.array(recipientSchema).optional(),
  CcFull: z.array(recipientSchema).optional(),
  Attachments: z.array(attachmentSchema).optional(),
});

export type PostmarkInboundPayload = z.infer<typeof postmarkInboundSchema>;

export function isPdfAttachment(att: {
  Name: string;
  ContentType?: string;
}): boolean {
  const type = (att.ContentType ?? "").toLowerCase();
  const name = att.Name.toLowerCase();
  return (
    type.includes("pdf") ||
    name.endsWith(".pdf") ||
    (type === "application/octet-stream" && name.endsWith(".pdf"))
  );
}
