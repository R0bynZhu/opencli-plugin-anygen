import { cli, Strategy } from "@jackwener/opencli/registry";
const listCommand = cli({
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
