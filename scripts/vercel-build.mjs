#!/usr/bin/env node
import { cpSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const distDir = join(projectRoot, "dist");
const outputDir = join(projectRoot, ".vercel/output");

const serverOut = join(outputDir, "server");
const clientOut = join(outputDir, "client");

console.log("[vercel-build] Copying dist/server → .vercel/output/server ...");
cpSync(join(distDir, "server"), serverOut, { recursive: true, force: true });

console.log("[vercel-build] Copying dist/client → .vercel/output/client ...");
cpSync(join(distDir, "client"), clientOut, { recursive: true, force: true });

// Update nitro.json
const nitroJsonPath = join(outputDir, "nitro.json");
if (existsSync(nitroJsonPath)) {
  const nitro = JSON.parse(readFileSync(nitroJsonPath, "utf-8"));
  writeFileSync(nitroJsonPath, JSON.stringify(nitro, null, 2));
}

// Create functions/__server.func with everything needed
const functionsDir = join(outputDir, "functions");
const serverFuncDir = join(functionsDir, "__server.func");
if (!existsSync(serverFuncDir)) {
  mkdirSync(serverFuncDir, { recursive: true });
}

// Copy server and client into function folder
cpSync(serverOut, join(serverFuncDir, "server"), { recursive: true, force: true });
cpSync(clientOut, join(serverFuncDir, "client"), { recursive: true, force: true });

// Copy nitro.json
cpSync(nitroJsonPath, join(serverFuncDir, "nitro.json"), { force: true });

// .vc-config.json
writeFileSync(join(serverFuncDir, ".vc-config.json"), JSON.stringify({
  handler: "index.mjs",
  launcherType: "Nodejs",
  shouldAddHelpers: true,
  supportsResponseStreaming: true,
  runtime: "nodejs24.x"
}, null, 2));

// index.mjs - simple import
writeFileSync(join(serverFuncDir, "index.mjs"), `
import handler from './server/index.mjs';
export default handler;
`);

// config.json - simple route all to __server
writeFileSync(join(outputDir, "config.json"), JSON.stringify({
  version: 3,
  routes: [
    { src: "/(.*)", dest: "/__server" }
  ]
}, null, 2));

console.log("[vercel-build] Done.");
