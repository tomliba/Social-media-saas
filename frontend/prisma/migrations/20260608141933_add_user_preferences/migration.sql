-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "captionStyle" TEXT,
    "captionFontSize" TEXT,
    "captionTransform" TEXT,
    "captionPosition" TEXT,
    "music" TEXT,
    "filmGrain" BOOLEAN,
    "shakeEffect" BOOLEAN,
    "language" TEXT,
    "characterNiche" TEXT,
    "characterName" TEXT,
    "characterVoiceId" TEXT,
    "characterSpeed" DOUBLE PRECISION,
    "characterBackgroundMode" TEXT,
    "characterArtStyle" TEXT,
    "characterTone" TEXT,
    "characterDuration" TEXT,
    "storyTopicPreset" TEXT,
    "storyArtStyle" TEXT,
    "storySceneMode" TEXT,
    "storyTone" TEXT,
    "storyVoiceId" TEXT,
    "storyDuration" INTEGER,
    "argumentCharacterA" TEXT,
    "argumentCharacterB" TEXT,
    "argumentTone" TEXT,
    "argumentDuration" INTEGER,
    "skeletonColor" TEXT,
    "skeletonVoiceId" TEXT,
    "skeletonTone" TEXT,
    "skeletonDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
