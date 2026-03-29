"use server";

import { tasks } from "@trigger.dev/sdk";
import type { renderPost } from "@trigger/render-post";

export interface PostRenderRequest {
  pgJobId: string;
  selectedIdeas: number[];
  ideaTopics: string[];
  settings: {
    tone: string;
    platform: string;
  };
}

export interface PostRenderHandle {
  runId: string;
  publicAccessToken: string;
  ideaTopics: string[];
}

export async function triggerPostRenders(
  request: PostRenderRequest
): Promise<PostRenderHandle> {
  const handle = await tasks.trigger<typeof renderPost>("render-post", {
    pgJobId: request.pgJobId,
    selectedIdeas: request.selectedIdeas,
    ideaTopics: request.ideaTopics,
    settings: request.settings,
  });

  return {
    runId: handle.id,
    publicAccessToken: handle.publicAccessToken!,
    ideaTopics: request.ideaTopics,
  };
}
