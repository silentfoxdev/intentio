"use strict";
const path = require("node:path");
const buildChrome = require("./build-chrome");
const buildFirefox = require("./build-firefox");

const root = path.join(__dirname, "..");
for (const [browser, build] of [["Chrome", buildChrome], ["Firefox", buildFirefox]]) {
  console.log(`${browser} extension ready in ${path.relative(root, build())}/`);
}
