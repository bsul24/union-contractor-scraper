import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { createCheerioPageLoader } from "../src/crawl/createCheerioPageLoader.js";

describe("createCheerioPageLoader", () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
    server = createServer((request, response) => {
      if (request.url === "/page") {
        response.writeHead(200, {
          "content-type": "text/html",
        });

        response.end(`
          <!doctype html>
          <html>
            <head>
              <title>Example Union</title>
            </head>
            <body>
              <h1>Example Union Page</h1>
            </body>
          </html>
        `);

        return;
      }

      if (request.url === "/redirect") {
        response.writeHead(302, {
          location: "/page",
        });

        response.end();
        return;
      }

      response.writeHead(404, {
        "content-type": "text/plain",
      });

      response.end("Not found");
    });

    server.listen(0, "127.0.0.1");

    await once(server, "listening");

    const address = server.address();

    assert.ok(address !== null && typeof address !== "string");

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  it("loads an HTML page", async () => {
    const pageUrl = `${baseUrl}/page`;

    const loadPage = createCheerioPageLoader({
      navigationTimeoutSecs: 5,
      maxRequestRetries: 0,
    });

    const page = await loadPage(pageUrl);

    assert.equal(page.requestedUrl, pageUrl);
    assert.equal(page.loadedUrl, pageUrl);

    assert.match(page.html, /Example Union Page/);
  });

  it("reports the final URL after a redirect", async () => {
    const requestedUrl = `${baseUrl}/redirect`;

    const loadedUrl = `${baseUrl}/page`;

    const loadPage = createCheerioPageLoader({
      navigationTimeoutSecs: 5,
      maxRequestRetries: 0,
    });

    const page = await loadPage(requestedUrl);

    assert.equal(page.requestedUrl, requestedUrl);

    assert.equal(page.loadedUrl, loadedUrl);

    assert.match(page.html, /Example Union Page/);
  });

  it("rejects when the request cannot be loaded", async () => {
    const loadPage = createCheerioPageLoader({
      navigationTimeoutSecs: 5,
      maxRequestRetries: 0,
    });

    await assert.rejects(
      () => loadPage(`${baseUrl}/missing-page`),
      /Failed to load/,
    );
  });
});
