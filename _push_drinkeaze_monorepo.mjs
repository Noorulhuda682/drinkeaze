import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const repoDir = process.cwd();
const remoteUrl = process.argv[2]?.trim() || "https://github.com/Noorulhuda682/drinkeaze.git";

if (!fs.existsSync(path.join(repoDir, "frontend")) || !fs.existsSync(path.join(repoDir, "backend"))) {
  throw new Error("Expected both 'frontend' and 'backend' directories inside the current folder.");
}

const gitignorePath = path.join(repoDir, ".gitignore");
const rootGitignore = [
  "node_modules/",
  "*/node_modules/",
  "*/*/node_modules/",
  ".next/",
  "*/.next/",
  "dist/",
  "*/dist/",
  "build/",
  "*/build/",
  ".env",
  ".env.*",
  "*/.env",
  "*/.env.*",
  "!.env.example",
  "!*/.env.example",
  ".DS_Store",
  "*.log",
].join("\n") + "\n";

fs.writeFileSync(gitignorePath, rootGitignore, "utf8");

if (!fs.existsSync(path.join(repoDir, ".git"))) {
  execSync("git init -b main", { cwd: repoDir, stdio: "inherit" });
} else {
  execSync("git branch -M main", { cwd: repoDir, stdio: "inherit" });
}

try {
  execSync("git remote get-url origin", { cwd: repoDir, stdio: "ignore" });
  execSync(`git remote set-url origin "${remoteUrl}"`, { cwd: repoDir, stdio: "inherit" });
} catch {
  execSync(`git remote add origin "${remoteUrl}"`, { cwd: repoDir, stdio: "inherit" });
}

// Ensure any previously tracked .env files or build artifacts are removed from git index if needed
for (const trackedPath of ["frontend/.env", "frontend/.env.local", "backend/.env", "backend/.env.local", ".env"]) {
  try {
    execSync(`git rm --cached --ignore-unmatch "${trackedPath}"`, { cwd: repoDir, stdio: "ignore" });
  } catch {
    // ignore
  }
}

execSync("git add .", { cwd: repoDir, stdio: "inherit" });

try {
  execSync('git commit -m "chore: push frontend and backend folders"', {
    cwd: repoDir,
    stdio: "inherit",
  });
} catch {
  console.log("No new changes to commit; proceeding to push.");
}

console.log(`\nPushing to ${remoteUrl} (branch: main)...`);
try {
  execSync("git push -u origin main", { cwd: repoDir, stdio: "inherit" });
} catch {
  console.log("\nNormal push rejected (likely due to earlier flat frontend commit on GitHub).");
  console.log("To replace remote main cleanly with ONLY frontend/ and backend/, run:");
  console.log("  git push --force -u origin main");
}
