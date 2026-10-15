import { z } from "zod";
import { objectIdSchema } from "./common";

export const chatRequestSchema = z.object({
  message: z.string().min(1, "Ask a question.").max(2000),
  conversationId: objectIdSchema.nullable().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;
