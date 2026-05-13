import { spawn } from "bun";

/**
 * YouTube Resolver Server for Monochrome
 * Uses the included yt-dlp binary to resolve YouTube URLs.
 */

const YT_DLP_PATH = `${import.meta.dir}/yt-dlp_linux`;

const server = Bun.serve({
  port: 3006,
  async fetch(req) {
    // Enable CORS
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    const url = new URL(req.url);

    if (url.pathname === "/youtube/proxy") {
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) {
        return new Response("Missing url parameter", { status: 400 });
      }

      const requestHeaders = new Headers();
      const range = req.headers.get("Range");
      if (range) requestHeaders.set("Range", range);
      requestHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

      try {
        const response = await fetch(targetUrl, {
          headers: requestHeaders,
        });

        const responseHeaders = new Headers(response.headers);
        responseHeaders.set("Access-Control-Allow-Origin", "*");
        responseHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        responseHeaders.set("Access-Control-Allow-Headers", "*");
        responseHeaders.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      } catch (error) {
        console.error("Proxy error:", error);
        return new Response("Proxy error", { status: 500 });
      }
    }

    if (url.pathname === "/youtube/resolve") {
      const query = url.searchParams.get("q");
      if (!query) {
        return new Response(JSON.stringify({ error: "Missing query" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      console.log(`Resolving: ${query}`);

      try {
        const proc = spawn([
          YT_DLP_PATH,
          "--get-url",
          "--format",
          "bestaudio",
          "--js-runtimes",
          "node",
          `ytsearch1:${query} lyrics`,
        ]);

        const stdout = await new Response(proc.stdout).text();
        const streamUrl = stdout.trim();

        if (!streamUrl) {
          return new Response(JSON.stringify({ error: "No results found" }), {
            status: 404,
            headers: { ...headers, "Content-Type": "application/json" },
          });
        }

        console.log(`Resolved to: ${streamUrl.substring(0, 50)}...`);

        return new Response(JSON.stringify({ url: streamUrl }), {
          headers: { ...headers, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error running yt-dlp:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`YouTube resolver server running at http://localhost:${server.port}`);
console.log(`Example: http://localhost:${server.port}/youtube/resolve?q=Never%20Gonna%20Give%20You%20Up`);
