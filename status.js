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

// status.ts
var statusCommand = cli({
  site: "anygen",
  name: "status",
  description: "Show AnyGen credits and subscription status",
  domain: "www.anygen.io",
  strategy: Strategy.COOKIE,
  browser: true,
  args: [],
  columns: ["plan", "base_credits", "daily_credits", "expires"],
  func: async (page) => {
    await page.goto("https://www.anygen.io/home");
    await page.wait({ selector: '[data-testid="chat-input-editor"]' });
    const data = await page.evaluate(`(async function() {
      var r = await fetch('/api/page/plans');
      var d = await r.json();
      return d.data;
    })()`);
    const plan = data.current_plan || {};
    const credit = data.credit || {};
    const base = credit.base || {};
    const daily = credit.daily || {};
    const planMap = {
      100: "Free",
      101: "Starter",
      105: "Pro",
      109: "Enterprise"
    };
    const expires = plan.expire_time ? new Date(plan.expire_time).toLocaleDateString("zh-CN") : "N/A";
    return [{
      plan: planMap[plan.type] || "Type " + plan.type,
      base_credits: base.available + " / " + base.all,
      daily_credits: daily.available + " / " + daily.all,
      expires
    }];
  }
});
export {
  statusCommand
};
