-- Live support chat (Gen 2) — replaces WordPress dg_support_* tables

CREATE TABLE IF NOT EXISTS "support_conversations" (
    "id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "organisation_id" TEXT,
    "contact_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "ai_paused" BOOLEAN NOT NULL DEFAULT false,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "support_conversations_clerk_user_id_key"
  ON "support_conversations"("clerk_user_id");
CREATE INDEX IF NOT EXISTS "support_conversations_last_message_at_idx"
  ON "support_conversations"("last_message_at");

CREATE TABLE IF NOT EXISTS "support_messages" (
    "id" SERIAL NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_role" TEXT NOT NULL,
    "sender_clerk_user_id" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "support_messages_conversation_id_id_idx"
  ON "support_messages"("conversation_id", "id");

ALTER TABLE "support_messages"
  DROP CONSTRAINT IF EXISTS "support_messages_conversation_id_fkey";

ALTER TABLE "support_messages"
  ADD CONSTRAINT "support_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "support_conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
