/**
 * Cloudflare Worker entry point for deploys and local `vinext dev`.
 *
 * Owns two things the bare vinext router does not:
 *   1. Image optimization via the Cloudflare Images binding (/_vinext/image).
 *   2. The `scheduled` handler that cron triggers call to run reminder
 *      enqueue (see wrangler.toml [triggers]).
 *
 * This file is checked in and maintained by hand — it is NOT auto-generated.
 * wrangler.toml `main` must point here. If you delete this file, deploys lose
 * cron reminders and image optimization.
 */
import {
  handleImageOptimization,
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
} from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

/** Minimal Cloudflare Workers Fetcher binding shape. */
interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

/** Options mirroring Cloudflare's image transform request shape. */
interface ImageTransformOptions {
  width?: number;
  height?: number;
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
  format?: "json" | "jpeg" | "png" | "webp" | "avif";
  quality?: number;
  animate?: boolean;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

/** Minimal Cloudflare scheduled-event shape. */
interface ScheduledController {
  scheduledTime: number;
  cron: string;
}

interface Env {
  ASSETS: Fetcher;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: ImageTransformOptions): {
        output(options: {
          format: string;
          quality: number;
        }): Promise<{ response(): Response }>;
      };
    };
  };
}

const CRON_ENDPOINT = "/api/internal/reminders/enqueue-due";

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Image optimization via Cloudflare Images binding.
    // The parseImageParams validation inside handleImageOptimization
    // normalizes backslashes and validates the origin hasn't changed.
    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];

      return handleImageOptimization(
        request,
        {
          fetchAsset: (path) =>
            env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body)
              .transform(width > 0 ? { width } : {})
              .output({ format, quality });

            return result.response();
          },
        },
        allowedWidths
      );
    }

    // Delegate everything else to vinext, forwarding ctx so that
    // ctx.waitUntil() is available to background cache writes and
    // other deferred work via getRequestExecutionContext().
    return handler.fetch(request, env, ctx);
  },

  async scheduled(
    _event: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ) {
    const secret = process.env.INTERNAL_CRON_SECRET;

    if (!secret) {
      return;
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://internal";

    await handler.fetch(
      new Request(
        `${origin}${CRON_ENDPOINT}?secret=${encodeURIComponent(secret)}`
      ),
      env,
      ctx
    );
  },
};

export default worker;
