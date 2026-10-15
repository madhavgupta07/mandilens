import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { chatRequestSchema } from "@/lib/validation/ai";
import { getProvider } from "@/lib/ai/providers";
import { runAssistant } from "@/lib/ai/agent";
import { toProviderMeta } from "@/lib/ai/provider-meta";
import { getCurrentUser } from "@/lib/auth/current-user";
import { rateLimit, clientKey } from "@/lib/auth/rate-limit";
import { connectToDatabase } from "@/lib/db/connect";
import { Conversation, AiMessage } from "@/lib/db/models";
import type { Types } from "mongoose";

export const dynamic = "force-dynamic";

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);

  const user = await getCurrentUser();
  const limit = rateLimit({
    key: clientKey(request.headers, "ai-chat", user?.id),
    limit: user ? 40 : 15,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    throw ApiError.tooMany("You have reached the assistant limit for now. Please try again shortly.");
  }

  const body = await request.json().catch(() => {
    throw ApiError.badRequest("Request body must be valid JSON.");
  });
  const input = chatRequestSchema.parse(body);

  const { provider, config, unavailableReason } = await getProvider();
  const providerMeta = toProviderMeta(config);

  // Persist the conversation when we know who is asking. Anonymous users still
  // get grounded answers; nothing is stored for them.
  let conversationId: string | null = null;
  let history = input.history ?? [];

  if (user) {
    await connectToDatabase();
    let conversation = null as null | { _id: Types.ObjectId; title: string };
    if (input.conversationId) {
      const found = await Conversation.findOne({
        _id: input.conversationId,
        user: user.id,
      }).lean();
      if (found) {
        conversation = { _id: found._id, title: found.title };
        const recent = await AiMessage.find({ conversation: found._id })
          .sort({ createdAt: -1 })
          .limit(12)
          .lean();
        history = recent
          .reverse()
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map((message) => ({
            role: message.role as "user" | "assistant",
            content: message.content,
          }));
      }
    }
    if (!conversation) {
      const created = await Conversation.create({
        user: user.id,
        title: input.message.slice(0, 80),
        provider: config.provider,
      });
      conversation = { _id: created._id, title: created.title };
      history = [];
    }
    conversationId = String(conversation._id);

    await AiMessage.create({
      conversation: conversation._id,
      role: "user",
      content: input.message,
    });
  }

  const result = await runAssistant({
    question: input.message,
    history,
    user,
    provider,
    providerMeta,
    unavailableReason,
  });

  if (user && conversationId) {
    await AiMessage.create({
      conversation: conversationId,
      role: "assistant",
      content: result.answer,
      meta: {
        mode: result.mode,
        provider: providerMeta,
        grounded: result.grounded,
        missingData: result.missingData,
        toolTrace: result.toolTrace,
        notes: result.notes,
      },
    });
    await Conversation.updateOne(
      { _id: conversationId },
      { $set: { provider: config.provider } },
    );
  }

  return ok({
    answer: result.answer,
    mode: result.mode,
    provider: providerMeta,
    toolTrace: result.toolTrace,
    grounded: result.grounded,
    missingData: result.missingData,
    notes: result.notes,
    conversationId,
    disclaimer: providerMeta.disclosure,
  });
});
