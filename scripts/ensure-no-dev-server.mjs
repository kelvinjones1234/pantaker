import fs from "node:fs";
import path from "node:path";

if (process.platform !== "linux") process.exit(0);

const root = fs.realpathSync(process.cwd());
const devProcesses = [];

for (const entry of fs.readdirSync("/proc")) {
  if (!/^\d+$/.test(entry)) continue;
  try {
    const cmdline = fs
      .readFileSync(`/proc/${entry}/cmdline`, "utf8")
      .replace(/\0/g, " ")
      .trim();
    if (!/next\b.*\bdev\b|next-server/.test(cmdline)) continue;
    const cwd = fs.realpathSync(`/proc/${entry}/cwd`);
    if (cwd !== root && !cwd.startsWith(`${root}${path.sep}`)) continue;
    devProcesses.push(`${entry}: ${cmdline}`);
  } catch {
    // Process exited or is not readable.
  }
}

if (devProcesses.length > 0) {
  console.error(
    "A Next.js dev server is running. Stop it before building; dev and build both write .next and will corrupt each other.",
  );
  for (const entry of devProcesses) console.error(`  ${entry}`);
  process.exit(1);
}
