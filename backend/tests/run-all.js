import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(backendRoot, "..");

const SUITES = {
  regression: [
    "tests/regression/wallet.regression.test.js",
    "tests/regression/progression.regression.test.js",
    "tests/regression/referral.regression.test.js",
    "tests/regression/withdrawal.regression.test.js",
    "tests/regression/overview.regression.test.js",
    "tests/regression/withdrawal-api-fix.regression.test.js"
  ],
  integration: [
    "tests/integration/frontend-contract.integration.test.js",
    "tests/integration/admin.integration.test.js",
    "tests/integration/acceptance.e2e.test.js"
  ],
  security: [
    "tests/security/security.test.js"
  ],
  production: [
    "tests/production/production-readiness.test.js"
  ]
};

const categoryArg = process.argv[2] || "all";
const filesToRun =
  categoryArg === "all"
    ? [
        ...SUITES.regression,
        ...SUITES.integration,
        ...SUITES.security,
        ...SUITES.production
      ]
    : SUITES[categoryArg];

if (!filesToRun) {
  console.error(`Unknown test category '${categoryArg}'. Valid categories: all, ${Object.keys(SUITES).join(", ")}`);
  process.exit(1);
}

console.log(`=== Running VE Loop Rewards Backend Tests (category: ${categoryArg}) ===\n`);

const summary = [];
let hasFailure = false;

for (const relativeFile of filesToRun) {
  console.log(`\n>>> Executing: ${relativeFile}`);
  const result = spawnSync(process.execPath, [path.join(backendRoot, relativeFile)], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env
  });

  const passed = result.status === 0;
  summary.push({ file: relativeFile, status: result.status, passed });
  if (!passed) {
    hasFailure = true;
  }
}

console.log("\n=======================================================");
console.log("BACKEND TEST RUNNER SUMMARY");
console.log("=======================================================");
for (const entry of summary) {
  console.log(`${entry.passed ? "[PASS]" : "[FAIL]"} ${entry.file} (exit ${entry.status})`);
}
console.log("=======================================================\n");

process.exit(hasFailure ? 1 : 0);

