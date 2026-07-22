import { z } from "zod";

import { EXPENSE_CATEGORIES } from "@/lib/finance/categories";
import { AI_MODEL_CHAT, getOpenAIClient } from "./client";

const receiptSchema = z.object({
  merchantName: z.string().max(140).nullable(),
  totalAmount: z.number().nullable(),
  date: z.string().nullable(),
  suggestedCategory: z.enum(EXPENSE_CATEGORIES).nullable(),
  summary: z.string().max(200).nullable(),
});

export type ExtractedReceipt = z.infer<typeof receiptSchema>;

/**
 * OCR via vision model — reads a photographed receipt and extracts
 * structured fields. Always returned for user review/correction before
 * being saved as a transaction; never auto-commits, since misread amounts
 * on financial data are a real-money mistake, unlike a misread food label.
 */
export async function extractReceiptData(imageDataUrl: string): Promise<ExtractedReceipt> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: AI_MODEL_CHAT,
    messages: [
      {
        role: "system",
        content:
          "Read this receipt photo and extract the merchant name, total amount paid (the final " +
          "total, not a subtotal), the transaction date if visible, a best-guess spending category " +
          "from the given list, and a one-sentence summary of what was purchased. Return null for " +
          "any field you can't confidently read — never guess a number.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the receipt details." },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "receipt_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            merchantName: { type: ["string", "null"] },
            totalAmount: { type: ["number", "null"] },
            date: { type: ["string", "null"] },
            suggestedCategory: { type: ["string", "null"], enum: [...EXPENSE_CATEGORIES, null] },
            summary: { type: ["string", "null"] },
          },
          required: ["merchantName", "totalAmount", "date", "suggestedCategory", "summary"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("The receipt scanner returned an empty response");
  }

  return receiptSchema.parse(JSON.parse(content));
}
