"use server";

import { tasks } from "@trigger.dev/sdk";
import type { renderVideo } from "@trigger/render-video";

export interface VideoRenderRequest {
  title: string;
  script: string;
  template: string;
  settings: {
    tone: string;
    presenter: string;
    voice: string;
    background: string;
    backgroundMode?: string;
    duration: string;
    layout: string;
  };
}

export interface VideoRenderHandle {
  runId: string;
  publicAccessToken: string;
  title: string;
}

export async function triggerVideoRenders(
  videos: VideoRenderRequest[]
): Promise<VideoRenderHandle[]> {
  const handles = await Promise.all(
    videos.map(async (video) => {
      const handle = await tasks.trigger<typeof renderVideo>("render-video", {
        title: video.title,
        script: video.script,
        template: video.template,
        settings: video.settings,
      });

      return {
        runId: handle.id,
        publicAccessToken: handle.publicAccessToken!,
        title: video.title,
      };
    })
  );

  return handles;
}
