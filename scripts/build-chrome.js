"use strict";
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = path.join(root, "extension");
const output = path.join(root, "dist", "chrome");

function buildChrome() {
  fs.rmSync(output, { recursive: true, force: true });
  fs.cpSync(source, output, { recursive: true });
  return output;
}

if (require.main === module) console.log(`Chrome extension ready in ${path.relative(root, buildChrome())}/`);
module.exports = buildChrome;
