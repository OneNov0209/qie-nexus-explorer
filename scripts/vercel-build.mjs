#!/usr/bin/env node
/**
 * Post-build script for Vercel deployment.
 * Makes `.vercel/output` self-contained by copying build artifacts
 * from `dist/` so relative paths resolve correctly for both
 * `vercel deploy --prebuilt` and Git-based Vercel builds.
 */
import { cpSync, readFileSync, writeFileSync } from "node:fs";
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

// Update nitro.json paths to be self-contained
const nitroJsonPath = join(outputDir, "nitro.json");
const nitro = JSON.parse(readFileSync(nitroJsonPath, "utf-8"));

// Paths should be relative to .vercel/output/functions/__server.func/
// "../../server/index.mjs" from functions/__server.func → .vercel/output/server/index.mjs
nitro.serverEntry = "../../server/index.mjs";
nitro.publicDir = "../../client";

writeFileSync(nitroJsonPath, JSON.stringify(nitro, null, 2));

console.log("[vercel-build] Vercel output is self-contained.");
console.log("[vercel-build] Deploy with:  npx vercel deploy --prebuilt");
