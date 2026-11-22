// Renders preview/index.html frame by frame through headless Chrome (CDP),
// then ffmpeg turns the PNG sequence into preview/token-stats.gif and .mp4.
// Usage: node preview/render.mjs [fps]
import { spawn } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const fps = Number(process.argv[2] || 20)
const W = 1240
const H = 660
const SCALE = 2
const framesDir = "/tmp/opencode/token-stats-frames"
const port = 9333 + Math.floor(Math.random() * 200)
const chrome = process.env.CHROME || "google-chrome"

rmSync(framesDir, { recursive: true, force: true })
mkdirSync(framesDir, { recursive: true })

const proc = spawn(chrome, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--window-size=${W},${H}`,
  "--hide-scrollbars",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--user-data-dir=/tmp/opencode/preview-chrome",
  "about:blank",
], { stdio: "ignore" })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function target() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      const page = list.find((t) => t.type === "page")
      if (page) return page
    } catch {}
    await sleep(100)
  }
  throw new Error("chrome did not start")
}

const page = await target()
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })

let id = 0
const pending = new Map()
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result)
  }
}
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const mid = ++id
    pending.set(mid, { res, rej })
    ws.send(JSON.stringify({ id: mid, method, params }))
  })

await send("Page.enable")
await send("Runtime.enable")
await send("Emulation.setDeviceMetricsOverride", {
  width: W, height: H, deviceScaleFactor: SCALE, mobile: false,
})
await send("Page.navigate", { url: `file://${resolve(here, "index.html")}` })

for (let i = 0; i < 100; i++) {
  const r = await send("Runtime.evaluate", { expression: "window.__ready === true", returnByValue: true })
  if (r.result.value) break
  await sleep(100)
}

const duration = (await send("Runtime.evaluate", { expression: "window.__duration", returnByValue: true })).result.value
const total = Math.round((duration / 1000) * fps)
console.log(`rendering ${total} frames at ${fps} fps (${duration / 1000}s)`)

for (let i = 0; i < total; i++) {
  const t = Math.round((i * 1000) / fps)
  await send("Runtime.evaluate", { expression: `window.__seek(${t})` })
  const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true })
  writeFileSync(resolve(framesDir, `f${String(i).padStart(4, "0")}.png`), Buffer.from(shot.data, "base64"))
  if (i % 20 === 0) process.stdout.write(`  ${i}/${total}\n`)
}

ws.close()
proc.kill()

const ff = (args) => new Promise((res, rej) => {
  const p = spawn("ffmpeg", args, { stdio: ["ignore", "inherit", "inherit"] })
  p.on("close", (code) => (code === 0 ? res() : rej(new Error("ffmpeg " + code))))
})

// palette-based GIF stays small and clean on flat UI colors
await ff([
  "-y", "-framerate", String(fps), "-i", resolve(framesDir, "f%04d.png"),
  "-vf", "scale=1040:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle",
  "-loop", "0", resolve(here, "token-stats.gif"),
])
await ff([
  "-y", "-framerate", String(fps), "-i", resolve(framesDir, "f%04d.png"),
  "-vf", "scale=1040:-1:flags=lanczos",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart",
  resolve(here, "token-stats.mp4"),
])
rmSync(framesDir, { recursive: true, force: true })
console.log("wrote preview/token-stats.gif and preview/token-stats.mp4")
