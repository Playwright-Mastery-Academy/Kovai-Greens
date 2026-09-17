const { createServer } = require("node:http");
const handler = require("../../../api/index.js");
createServer((req, res) =>
  handler(req, res).catch((error) => {
    console.error(error);
    res.statusCode = 500;
    res.end("Function error");
  }),
).listen(Number(process.env.PORT), "127.0.0.1");
