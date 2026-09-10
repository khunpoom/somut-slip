"use strict";

const { exec, spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const TARGET = "http://127.0.0.1:8080/";
const root = process.cwd();

function open(url) {
  if (process.platform === "win32") exec(`cmd /c start "" "${url}"`);
  else exec(`xdg-open "${url}"`);
}

function startDev() {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npm, ["run", "dev"], {
    cwd: root,
    detached: true,
    stdio: "ignore",
    shell: true,
  });
  child.unref();
}

function probe() {
  const req = http.get(TARGET, () => {
    open(TARGET);
  });
  req.on("error", () => {
    if (fs.existsSync(path.join(root, "package.json"))) {
      startDev();
      setTimeout(() => open(TARGET), 5000);
      return;
    }
    open("https://github.com/khunpoom/somut-slip");
  });
  req.setTimeout(1500, () => req.destroy());
}

console.log("Somut Slip — hobby project written with Grok");
probe();
