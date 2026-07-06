-- AlterEnum
-- Adds YOUTUBE as a persistable publishing/OAuth provider.
-- Additive and non-destructive: existing values (FACEBOOK, INSTAGRAM, WHATSAPP) are untouched.
ALTER TYPE "OAuthProvider" ADD VALUE 'YOUTUBE';
