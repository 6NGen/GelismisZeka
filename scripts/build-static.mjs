#!/usr/bin/env node
/**
 * GitHub Pages için statik tanıtım çıktısı üretir.
 *
 * `output: "export"` sunucu route'larıyla birlikte çalışmaz; bu yüzden API
 * dizini derleme süresince geçici olarak ağacın dışına alınır ve iş bitince —
 * derleme hata verse bile — yerine konur.
 *
 * Üretilen çıktı `out/` dizinindedir ve yalnız önbellekli örnekleri açar.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const apiDir = join(root, "app", "api");
const stash = join(root, ".api-stash");

let moved = false;

function restore() {
  if (moved && existsSync(stash)) {
    renameSync(stash, apiDir);
    moved = false;
  }
}

process.on("exit", restore);
process.on("SIGINT", () => { restore(); process.exit(130); });

try {
  if (existsSync(apiDir)) {
    renameSync(apiDir, stash);
    moved = true;
    console.log("· app/api derleme süresince dışarı alındı");
  }

  execSync("npx next build", {
    stdio: "inherit",
    env: { ...process.env, GZ_STATIC: "1", NEXT_PUBLIC_GZ_STATIC: "1" },
  });

  // Jekyll _next dizinini yok sayar; bu dosya olmadan sayfa stilsiz açılır.
  mkdirSync(join(root, "out"), { recursive: true });
  writeFileSync(join(root, "out", ".nojekyll"), "");
  console.log("· out/.nojekyll yazıldı");
  console.log("\nStatik tanıtım çıktısı hazır: out/");
} finally {
  restore();
  console.log("· app/api yerine kondu");
}
