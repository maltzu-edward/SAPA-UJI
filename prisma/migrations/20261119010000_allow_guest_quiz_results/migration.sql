-- Quiz feedback is available without creating an account. Anonymous attempts are
-- intentionally not persisted; this nullable key is only used for signed-in users.
ALTER TABLE "QuizAttempt" ALTER COLUMN "userId" DROP NOT NULL;
