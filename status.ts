import { cli, Strategy } from '@jackwener/opencli/registry';

export const statusCommand = cli({
  site: 'anygen',
  name: 'status',
  description: 'Show AnyGen credits and subscription status',
  domain: 'www.anygen.io',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [],
  columns: ['plan', 'base_credits', 'daily_credits', 'expires'],
  func: async (page) => {
    await page.goto('https://www.anygen.io/home');
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

    const planMap: Record<number, string> = {
      100: 'Free',
      101: 'Starter',
      105: 'Pro',
      109: 'Enterprise',
    };

    const expires = plan.expire_time
      ? new Date(plan.expire_time).toLocaleDateString('zh-CN')
      : 'N/A';

    return [{
      plan: planMap[plan.type as number] || ('Type ' + plan.type),
      base_credits: base.available + ' / ' + base.all,
      daily_credits: daily.available + ' / ' + daily.all,
      expires,
    }];
  },
});
