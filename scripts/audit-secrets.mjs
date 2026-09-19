import { execFileSync } from "node:child_process";

const patterns = [
  "sk-[A-Za-z0-9_-]{20,}",
  "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
  "(FEDERATO_CLIENT_SECRET|BASETEN_API_KEY|OPENAI_API_KEY|SENTRY_AUTH_TOKEN)=[^[:space:]]{12,}",
];

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

if (files.length === 0) process.exit(0);

let failed = false;
for (const pattern of patterns) {
  try {
    const result = execFileSync("rg", ["--line-number", "--regexp", pattern, ...files], { encoding: "utf8" });
    if (result.trim()) {
      failed = true;
      process.stderr.write(result);
    }
  } catch (error) {
    if (error.status !== 1) throw error;
  }
}

if (failed) process.exit(1);
console.log(`Secret audit passed across ${files.length} tracked files.`);
