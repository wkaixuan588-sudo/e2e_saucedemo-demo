import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

// SauceDemo 冒烟与核心流程测试
// 运行：npx e2e run saucedemo --target saucedemo
// 账号是靶场公开的固定测试账号，无需随机化

const USER = 'standard_user';
const PASS = 'secret_sauce';

// 公共步骤：登录（多个用例复用，等于传统的 page object）
// 注意：locator 里的 'Username'/'Password'/'Login' 是页面 UI 的英文文案，必须精确匹配
async function login(app: any, screen: any, user = USER, pass = PASS) {
  await app.open('/');
  await screen.getByPlaceholder('Username').fill(user);
  await screen.getByPlaceholder('Password').fill(pass);
  await screen.getByRole('button', { name: 'Login' }).click();
}

test('有效账号登录成功，进入商品列表页', async ({ app, screen, browser }) => {
  await login(app, screen);

  // 结构断言：URL 进入商品列表页
  await expect(browser).toHaveURL(/inventory\.html/);
  // 功能断言：页面标题可见——双重断言更稳
  await expect(screen.getByText('Products')).toBeVisible();
});

test('AI 完成加购并结账下单，全流程成功', { timeout: 300_000 }, async ({ app, agent, screen, browser }) => {
  // ── 准备（确定性，0 token）：登录是公共前置，写死后复用且不花模型调用
  await login(app, screen);
  await expect(browser).toHaveURL(/inventory\.html/);

  // ── agent.act：加购按钮的 data-test 每个商品都不同（易变）→ 交给 AI
  await agent.act('把名为 Sauce Labs Backpack 的商品加入购物车');

  // ── expect：锁定 act 结果 → 触发录制回放缓存（下次运行 0 模型调用）
  // 教训：徽章 span 没有 status role；语义树里它是 button "Cart, 1 items"
  //（可访问名自带数量）——先跑失败看 trace 再改，比猜 role 靠谱
  await expect(screen.getByRole('button', { name: 'Cart, 1 items' })).toBeVisible();

  // ── agent.act：结账三页流程长、表单多 → 交给 AI（字段值在指令里给全）
  await agent.act('完成结账：名字 Ada，姓氏 Lovelace，邮编 12345');

  // ── expect：URL + 完成语双重锁定
  await expect(browser).toHaveURL(/checkout-complete\.html/);
  await expect(screen.getByText('Thank you for your order!')).toBeVisible();

  // ── agent.assert：每用例只留一个"目测型"总把关（每次 ~2 次调用，不缓存）
  await agent.assert('页面显示订单成功完成，带有确认信息');
});

test('AI 移除商品后购物车清空', { timeout: 300_000 }, async ({ app, agent, screen, browser }) => {
  // 前置（确定性）：登录
  await login(app, screen);
  await expect(browser).toHaveURL(/inventory\.html/);

  // 加购（act，回放缓存）
  await agent.act('把名为 Sauce Labs Backpack 的商品加入购物车');
  await expect(screen.getByRole('button', { name: 'Cart, 1 items' })).toBeVisible();

  // 移除（学员措辞修正版：从购物车中移除）
  await agent.act('把名为 Sauce Labs Backpack 的商品从购物车中移除');

  // 购物车清空 = 徽章节点整个消失 → 确定性断言（0 token），
  // 不用 agent.assert：能用"节点不在"说清的事实不花 AI 的钱
  await expect(screen.getByRole('button', { name: 'Cart, 1 items' })).not.toBeVisible();
});

test('排序下拉选择价格从低到高，商品按价格升序排列', async ({ app, screen, browser }) => {
  await login(app, screen);
  await expect(browser).toHaveURL(/inventory\.html/);

  // 操作：下拉选择（combobox 用 selectOption，label 是树里 option 的名字）
  await screen
    .getByRole('combobox', { name: 'Sort products' })
    .selectOption({ label: 'Price (low to high)' });

  // 断言1（状态）：下拉当前值已切换
  await expect(screen.getByRole('combobox', { name: 'Sort products' })).toHaveValue('lohi');

  // 断言2（结果）：抓取全部 6 个价格节点，按页面顺序比较
  const prices = await browser.locator('.inventory_item_price').allTextContents();
  // SauceDemo 六件商品的固定价格，升序应为：
  expect(prices).toEqual(['$7.99', '$9.99', '$15.99', '$15.99', '$29.99', '$49.99']);
});
