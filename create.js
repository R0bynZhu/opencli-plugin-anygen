import { cli, Strategy } from "@jackwener/opencli/registry";
import { CommandExecutionError } from "@jackwener/opencli/errors";
import * as fs from "node:fs";
import * as path from "node:path";
const TYPE_LABELS = {
  slides: "\u9009\u62E9\u5E7B\u706F\u7247\u7C7B\u578B",
  design: "\u9009\u62E9 AI \u8BBE\u8BA1\u5E08\u7C7B\u578B",
  video: "\u751F\u6210\u89C6\u9891",
  storybook: "\u9009\u62E9\u6545\u4E8B\u4E66\u7C7B\u578B",
  research: "\u6279\u91CF\u8C03\u7814",
  data: "\u9009\u62E9\u6570\u636E\u5206\u6790\u7C7B\u578B",
  chart: "\u7ED8\u5236\u56FE\u8868"
};
const createCommand = cli({
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
