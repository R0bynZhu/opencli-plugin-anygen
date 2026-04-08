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

// list.ts
var listCommand = cli({
  site: "anygen",
  name: "list",
  description: "List recent AnyGen documents from your library",
  domain: "www.anygen.io",
  strategy: Strategy.UI,
  browser: true,
  args: [
    { name: "limit", type: "int", default: 10 }
  ],
  columns: ["title", "date", "token"],
  func: async (page, kwargs) => {
    const limit = Number(kwargs.limit) || 10;
    await page.goto("https://www.anygen.io/home");
    await page.wait({ selector: '[aria-label="Library"]' });
    await page.evaluate(`(function() {
      var btn = document.querySelector('[aria-label="Library"]');
      if (btn) btn.click();
    })()`);
    await page.wait(3);
    await page.evaluate(`(function() {
      var recent = document.querySelector('[aria-label="\u6700\u8FD1"]');
      if (recent && recent.getAttribute('aria-expanded') !== 'true') recent.click();
    })()`);
    await page.wait(2);
    const items = await page.evaluate(`(function() {
      var links = Array.from(document.querySelectorAll('a'));
      var filtered = links.filter(function(a) {
        return a.href && a.href.indexOf('/task/') >= 0 && a.textContent && a.textContent.trim() && a.href.indexOf('library_file_token') < 0;
      });
      return filtered.map(function(a) {
        var token = a.href.split('/task/')[1] || '';
        var parent = a.parentElement;
        var dateEl = parent ? parent.querySelector('span') : null;
        return {
          title: a.textContent.trim(),
          date: dateEl ? dateEl.textContent || '' : '',
          token: token
        };
      });
    })()`);
    return items.slice(0, limit);
  }
});
export {
  listCommand
};
