"use strict";
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = path.join(root, "extension");
const output = path.join(root, "dist", "firefox");

function buildFirefox() {
  fs.rmSync(output, { recursive: true, force: true });
  fs.cpSync(source, output, { recursive: true });

  const manifestPath = path.join(output, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  delete manifest.background.service_worker;
  manifest.background.scripts = ["core.js", "background.js"];
  delete manifest.minimum_chrome_version;
  manifest.browser_specific_settings = {
    gecko: {
      id: "intentio@silentfox.dev",
      strict_min_version: "140.0",
      data_collection_permissions: { required: ["none"] }
    },
    gecko_android: { strict_min_version: "142.0" }
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return output;
}

if (require.main === module) console.log(`Firefox extension ready in ${path.relative(root, buildFirefox())}/`);
module.exports = buildFirefox;
