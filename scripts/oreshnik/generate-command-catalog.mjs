import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = join(root, "node_modules", "oreshnik-cli", "dist", "cli.js");
const outputPath = join(root, "docs", "operations", "oreshnik-command-catalog.json");

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`oreshnik ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function parseCommands(helpText) {
  const lines = helpText.split(/\r?\n/);
  const commands = [];
  let inCommands = false;
  let current = null;

  for (const line of lines) {
    if (/^Commands:/.test(line)) {
      inCommands = true;
      continue;
    }
    if (inCommands && /^[A-Z][A-Za-z ]+:/.test(line)) break;
    if (!inCommands) continue;

    const match = line.match(/^\s{2}([a-z][\w:-]*)(?:\s|\[|<|$)(.*)$/);
    if (match) {
      current = {
      name: match[1],
      summary: match[2].trim().replace(/\s+/g, " "),
      };
      commands.push(current);
      continue;
    }

    const continuation = line.match(/^\s{24,}(.+)$/);
    if (current && continuation) {
      current.summary = `${current.summary} ${continuation[1].trim()}`.trim().replace(/\s+/g, " ");
    }
  }

  return commands;
}

function catalogFor(args = [], depth = 0) {
  const help = runCli([...args, "--help"]);
  const commands = parseCommands(help);
  return commands.map((command) => {
    const nextArgs = [...args, command.name];
    const entry = {
      command: nextArgs.join(" "),
      summary: command.summary,
    };
    if (depth < 1) {
      const subcommands = catalogFor(nextArgs, depth + 1);
      if (subcommands.length > 0) entry.subcommands = subcommands;
    }
    return entry;
  });
}

const version = runCli(["--version"]).trim();
const catalog = {
  schema: "heptacore-oreshnik-command-catalog/v1",
  source: "node_modules/oreshnik-cli/dist/cli.js",
  version,
  commands: catalogFor(),
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Generated ${outputPath}`);
