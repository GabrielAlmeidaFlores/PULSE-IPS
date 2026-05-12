// @ts-check
"use strict"

const fs = require("fs")
const path = require("path")

const chunksDir = path.join(process.cwd(), ".next", "server", "chunks")
const nmDir = path.join(process.cwd(), "node_modules")

let content = ""
try {
  const files = fs.readdirSync(chunksDir).filter((f) => f.endsWith(".js"))
  for (const f of files) {
    try {
      content += fs.readFileSync(path.join(chunksDir, f), "utf8")
    } catch (_) {}
  }
} catch (_) {
  process.exit(0)
}

const seen = new Set()
const re = /require\("([a-z@][^"]+)-([0-9a-f]{16})"\)/g
let m
while ((m = re.exec(content)) !== null) {
  const hashed = m[1] + "-" + m[2]
  if (!seen.has(hashed)) {
    seen.add(hashed)
    const base = path.join(nmDir, m[1])
    const dst = path.join(nmDir, hashed)
    if (fs.existsSync(base) && !fs.existsSync(dst)) {
      try {
        fs.symlinkSync(fs.realpathSync(base), dst)
        console.log("Linked:", hashed, "->", m[1])
      } catch (err) {
        console.log("Failed to link", hashed, err instanceof Error ? err.message : String(err))
      }
    }
  }
}
