// Vercel Node Function: reuse Nest and Prisma across warm requests.
const { createApp } = require("../apps/api/dist/main.js");
let appPromise;
module.exports = async function handler(req, res) {
  appPromise ||= createApp().catch((error) => {
    appPromise = undefined;
    throw error;
  });
  const app = await appPromise;
  const url = new URL(req.url, "http://localhost");
  const route = url.searchParams.get("__path") ?? req.query?.__path;
  if (typeof route === "string") {
    url.searchParams.delete("__path");
    req.url = "/api/" + route + url.search;
  }
  return app.getHttpAdapter().getInstance()(req, res);
};
