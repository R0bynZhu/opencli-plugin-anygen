// node_modules/@jackwener/opencli/dist/src/registry.js
var Strategy;
(function(Strategy2) {
  Strategy2["PUBLIC"] = "public";
  Strategy2["COOKIE"] = "cookie";
  Strategy2["HEADER"] = "header";
  Strategy2["INTERCEPT"] = "intercept";
  Strategy2["UI"] = "ui";
})(Strategy || (Strategy = {}));
var _registry = globalThis.__opencli_registry__ ??= /* @__PURE__ */ new Map();
function cli(opts) {
  const strategy = opts.strategy ?? (opts.browser === false ? Strategy.PUBLIC : Strategy.COOKIE);
  const browser = opts.browser ?? strategy !== Strategy.PUBLIC;
  const aliases = normalizeAliases(opts.aliases, opts.name);
  const cmd = {
    site: opts.site,
    name: opts.name,
    aliases,
    description: opts.description ?? "",
    domain: opts.domain,
    strategy,
    browser,
    args: opts.args ?? [],
    columns: opts.columns,
    func: opts.func,
    pipeline: opts.pipeline,
    timeoutSeconds: opts.timeoutSeconds,
    footerExtra: opts.footerExtra,
    requiredEnv: opts.requiredEnv,
    deprecated: opts.deprecated,
    replacedBy: opts.replacedBy,
    navigateBefore: opts.navigateBefore,
    defaultFormat: opts.defaultFormat
  };
  registerCommand(cmd);
  return cmd;
}
function fullName(cmd) {
  return `${cmd.site}/${cmd.name}`;
}
function registerCommand(cmd) {
  const canonicalKey = fullName(cmd);
  const existing = _registry.get(canonicalKey);
  if (existing) {
    for (const [key, value] of _registry.entries()) {
      if (value === existing && key !== canonicalKey)
        _registry.delete(key);
    }
  }
  const aliases = normalizeAliases(cmd.aliases, cmd.name);
  cmd.aliases = aliases.length > 0 ? aliases : void 0;
  _registry.set(canonicalKey, cmd);
  for (const alias of aliases) {
    _registry.set(`${cmd.site}/${alias}`, cmd);
  }
}
function normalizeAliases(aliases, commandName) {
  if (!Array.isArray(aliases) || aliases.length === 0)
    return [];
  const seen = /* @__PURE__ */ new Set();
  const normalized = [];
  for (const alias of aliases) {
    const value = typeof alias === "string" ? alias.trim() : "";
    if (!value || value === commandName || seen.has(value))
      continue;
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

// node_modules/@jackwener/opencli/dist/src/hooks.js
var _hooks = globalThis.__opencli_hooks__ ??= /* @__PURE__ */ new Map();

// node_modules/@jackwener/opencli/dist/src/errors.js
var EXIT_CODES = {
  SUCCESS: 0,
  GENERIC_ERROR: 1,
  USAGE_ERROR: 2,
  // Bad arguments / command misuse
  EMPTY_RESULT: 66,
  // No data / not found           (EX_NOINPUT)
  SERVICE_UNAVAIL: 69,
  // Daemon / browser unavailable  (EX_UNAVAILABLE)
  TEMPFAIL: 75,
  // Timeout — try again later     (EX_TEMPFAIL)
  NOPERM: 77,
  // Auth required / permission    (EX_NOPERM)
  CONFIG_ERROR: 78,
  // Missing / invalid config      (EX_CONFIG)
  INTERRUPTED: 130
  // Ctrl-C / SIGINT
};
var CliError = class extends Error {
  /** Machine-readable error code (e.g. 'BROWSER_CONNECT', 'AUTH_REQUIRED') */
  code;
  /** Human-readable hint on how to fix the problem */
  hint;
  /** Unix process exit code — defaults to 1 (generic error) */
  exitCode;
  constructor(code, message, hint, exitCode = EXIT_CODES.GENERIC_ERROR) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.hint = hint;
    this.exitCode = exitCode;
  }
};
var CommandExecutionError = class extends CliError {
  constructor(message, hint) {
    super("COMMAND_EXEC", message, hint, EXIT_CODES.GENERIC_ERROR);
  }
};

// create.ts
import * as fs from "node:fs";
import * as path from "node:path";
var TYPE_LABELS = {
  slides: "\u9009\u62E9\u5E7B\u706F\u7247\u7C7B\u578B",
  design: "\u9009\u62E9 AI \u8BBE\u8BA1\u5E08\u7C7B\u578B",
  video: "\u751F\u6210\u89C6\u9891",
  storybook: "\u9009\u62E9\u6545\u4E8B\u4E66\u7C7B\u578B",
  research: "\u6279\u91CF\u8C03\u7814",
  data: "\u9009\u62E9\u6570\u636E\u5206\u6790\u7C7B\u578B",
  chart: "\u7ED8\u5236\u56FE\u8868"
};
var createCommand = cli({
  site: "anygen",
  name: "create",
  description: "Create a new AnyGen document (default), slides, design, video, etc.",
  domain: "www.anygen.io",
  strategy: Strategy.UI,
  browser: true,
  args: [
    { name: "prompt", type: "string", required: true },
    { name: "type", type: "string", default: "doc" },
    { name: "files", type: "string", required: false, help: "Comma-separated file paths to attach" }
  ],
  columns: ["title", "url", "token"],
  func: async (page, kwargs) => {
    const prompt = String(kwargs.prompt ?? "");
    const docType = String(kwargs.type ?? "doc");
    const filesRaw = String(kwargs.files ?? "");
    const filePaths = filesRaw ? filesRaw.split(",").map((f) => path.resolve(f.trim())).filter(Boolean) : [];
    for (const fp of filePaths) {
      if (!fs.existsSync(fp)) {
        throw new CommandExecutionError(`File not found: ${fp}`);
      }
    }
    await page.goto("https://www.anygen.io/home");
    await page.wait({ selector: '[data-testid="chat-input-editor"]' });
    const modeLabel = TYPE_LABELS[docType];
    if (modeLabel) {
      const clicked = await page.evaluate(`(function() {
        var btn = document.querySelector('[aria-label="${modeLabel}"]');
        if (btn) { btn.click(); return true; }
        return false;
      })()`);
      if (!clicked) {
        throw new CommandExecutionError("Mode button not found for type: " + docType);
      }
      await page.wait(0.5);
    }
    for (const fp of filePaths) {
      const fileName = path.basename(fp);
      await page.setFileInput([fp], 'input[type="file"]');
      const uploadResult = await page.evaluate(`(function() {
        var input = document.querySelector('input[type="file"]');
        if (!input) return { ok: false, error: 'no file input' };
        var propsKey = Object.keys(input).find(function(k) { return k.startsWith('__reactProps'); });
        if (!propsKey) return { ok: false, error: 'no react props' };
        input[propsKey].onChange({
          target: input, currentTarget: input, type: 'change',
          bubbles: true, preventDefault: function(){}, stopPropagation: function(){}
        });
        return { ok: true, fileName: ${JSON.stringify(fileName)} };
      })()`);
      if (!uploadResult || !uploadResult.ok) {
        throw new CommandExecutionError(`File upload failed: ${uploadResult?.error || fp}`);
      }
      const appeared = await page.evaluate(`(async function() {
        var name = ${JSON.stringify(fileName)};
        for (var i = 0; i < 60; i++) {
          await new Promise(function(r) { setTimeout(r, 500); });
          // Text files: filename appears in <p>
          var ps = document.querySelectorAll('p');
          for (var j = 0; j < ps.length; j++) {
            if (ps[j].textContent === name) return true;
          }
          // Image files: blob thumbnail appears anywhere on page
          if (document.querySelector('img[src^="blob:"]')) return true;
          // Universal fallback: send button enabled means content (file/text) is ready
          var btn = document.querySelector('[data-testid="send-button"]');
          if (btn && !btn.disabled) return true;
        }
        return false;
      })()`);
      if (!appeared) {
        throw new CommandExecutionError(`Timed out waiting for file to be processed: ${fileName}`);
      }
    }
    const typed = await page.evaluate(`(function() {
      var ce = document.querySelector('.tiptap.ProseMirror');
      if (!ce || !ce.editor) return false;
      ce.editor.commands.focus();
      ce.editor.commands.insertContent(${JSON.stringify(prompt)});
      return true;
    })()`);
    if (!typed) {
      throw new CommandExecutionError("Could not find chat input editor");
    }
    let sent = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      await page.wait(0.3);
      const btnReady = await page.evaluate(`(function() {
        var btn = document.querySelector('[data-testid="send-button"]');
        return btn ? !btn.disabled : false;
      })()`);
      if (btnReady) {
        await page.evaluate(`(function() {
          var btn = document.querySelector('[data-testid="send-button"]');
          if (btn && !btn.disabled) btn.click();
        })()`);
        sent = true;
        break;
      }
    }
    if (!sent) {
      throw new CommandExecutionError("Send button not found or disabled");
    }
    const taskUrl = await page.evaluate(`(async function() {
      for (var i = 0; i < 40; i++) {
        await new Promise(function(r) { setTimeout(r, 500); });
        if (window.location.href.indexOf('/task/') >= 0) {
          return window.location.href;
        }
      }
      return null;
    })()`);
    if (!taskUrl) {
      throw new CommandExecutionError("Timed out waiting for task page navigation");
    }
    const token = String(taskUrl).split("/task/")[1] || "";
    const meta = await page.evaluate(`(async function() {
      var r = await fetch('/api/page/pages/' + ${JSON.stringify(token)});
      var d = await r.json();
      return { title: (d.data && d.data.page_meta && d.data.page_meta.title) || '' };
    })()`);
    return [{ title: meta.title || prompt, url: taskUrl, token }];
  }
});
export {
  createCommand
};
