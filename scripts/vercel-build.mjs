#!/usr/bin/env node
import { cpSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const distDir = join(projectRoot, "dist");
const outputDir = join(projectRoot, ".vercel/output");

// Ensure output directories exist
const serverOut = join(outputDir, "server");
const clientOut = join(outputDir, "client");

console.log("[vercel-build] Copying dist/server → .vercel/output/server ...");
cpSync(join(distDir, "server"), serverOut, { recursive: true, force: true });

console.log("[vercel-build] Copying dist/client → .vercel/output/client ...");
cpSync(join(distDir, "client"), clientOut, { recursive: true, force: true });

// Update nitro.json paths
const nitroJsonPath = join(outputDir, "nitro.json");
if (existsSync(nitroJsonPath)) {
  const nitro = JSON.parse(readFileSync(nitroJsonPath, "utf-8"));
  nitro.serverEntry = "../../server/index.mjs";
  nitro.publicDir = "../../client";
  writeFileSync(nitroJsonPath, JSON.stringify(nitro, null, 2));
}

// Create functions directory if it doesn't exist
const functionsDir = join(outputDir, "functions");
const serverFuncDir = join(functionsDir, "__server.func");
if (!existsSync(serverFuncDir)) {
  mkdirSync(serverFuncDir, { recursive: true });
}

// Create .vc-config.json for the server function
const vcConfigPath = join(serverFuncDir, ".vc-config.json");
writeFileSync(vcConfigPath, JSON.stringify({
  handler: "index.mjs",
  launcherType: "Nodejs",
  shouldAddHelpers: false,
  supportsResponseStreaming: true,
  runtime: "nodejs24.x"
}, null, 2));

// Create the server function entry point
const serverFuncEntry = join(serverFuncDir, "index.mjs");
writeFileSync(serverFuncEntry, `
import { createServer } from 'nitro/node';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '../../..');

const server = createServer({
  rootDir,
  entry: join(__dirname, '../../server/index.mjs'),
});

export default server;
`);

// Create config.json for Vercel routing
const configPath = join(outputDir, "config.json");
writeFileSync(configPath, JSON.stringify({
  version: 3,
  routes: [
    {
      src: "/(.*)",
      dest: "/__server"
    }
  ]
}, null, 2));

console.log("[vercel-build] Vercel output configured successfully.");
console.log("[vercel-build] Deploy with:  npx vercel deploy --prebuilt");
