import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

// ============================================================
// 本文件由「测试用例 Excel 导入流水线」生成：
//   SauceDemo测试用例.xlsx → 前 10 条（TC-01 ~ TC-10）→ 自动翻译为 e2e 用例
// 运行：npx e2e run saucedemo-import --target saucedemo
// ============================================================

const USER = 'standard_user';
const PASS = 'secret_sauce';

// 公共：登录（可传任意账号密码）
async function login(app: any, screen: any, user = USER, pass = PASS) {
  await app.open('/');
  await screen.getByPlaceholder('Username').fill(user);
  await screen.getByPlaceholder('Password').fill(pass);
  await screen.getByRole('button', { name: 'Login' }).click();
}

// ---------- 登录模块 ----------

test('TC-01 登录：有效账号登录成功', async ({ app, screen, browser }) => {
  await login(app, screen);
  await expect(browser).toHaveURL(/inventory\.html/);
  await expect(screen.getByText('Products')).toBeVisible();
});

test('TC-02 登录：错误密码登录失败', async ({ app, screen, browser }) => {
  await login(app, screen, USER, 'wrong_password');
  // 停留在登录页
  await expect(browser).not.toHaveURL(/inventory/);
  // 红色错误条（SauceDemo 的错误容器 data-test=error）
  await expect(screen.getByRole('alert')).toContainText('Epic sadface');
  await expect(screen.getByRole('alert')).toContainText('do not match');
});

test('TC-03 登录：账号密码为空直接提交', async ({ app, screen }) => {
  await app.open('/');
  await screen.getByRole('button', { name: 'Login' }).click();
  await expect(screen.getByRole('alert')).toContainText('Username is required');
});

test('TC-04 登录：被锁定账号无法登录', async ({ app, screen }) => {
  await login(app, screen, 'locked_out_user', PASS);
  await expect(screen.getByRole('alert')).toContainText('locked out');
});

// ---------- 导航模块 ----------

test('TC-05 导航：侧边菜单打开与登出', async ({ app, screen, browser }) => {
  await login(app, screen);
  // 打开菜单（≡ 按钮的可访问名是 Open Menu）
  await screen.getByRole('button', { name: 'Open Menu' }).click();
  await screen.getByRole('button', { name: 'Logout' }).click();
  // 回到登录页
  await expect(browser).not.toHaveURL(/inventory/);
  await expect(screen.getByRole('button', { name: 'Login' })).toBeVisible();
});

test('TC-06 导航：菜单重置应用状态', async ({ app, screen }) => {
  await login(app, screen);
  // 前置：先加购一件（用 testid 精确定位该商品的加购按钮）
  await screen.getByRole('button', { name: 'Add to cart' }).first().click();
  await expect(screen.getByRole('button', { name: 'Cart, 1 items' })).toBeVisible();

  // 菜单 → Reset App State
  await screen.getByRole('button', { name: 'Open Menu' }).click();
  await screen.getByRole('button', { name: 'Reset App State' }).click();

  // 关闭菜单（菜单开着会遮挡商品，导致计数少 1）
  await screen.getByRole('button', { name: 'Close Menu' }).click();
  // 徽章消失（Reset 立即生效）
  await expect(screen.getByRole('button', { name: 'Cart, empty' })).toBeVisible();
  // SauceDemo 怪癖：Reset 后按钮文字不刷新（仍显示 Remove），
  // 重新加载页面后才是最终状态——断言最终状态而非中间态
  await app.open('/inventory.html');
  await expect(screen.getByRole('button', { name: 'Add to cart' })).toHaveCount(6);
});

// ---------- 商品列表模块 ----------

test('TC-07 商品列表：六个商品全部展示', async ({ app, screen, browser }) => {
  await login(app, screen);
  // 加购按钮 × 6、商品卡片 × 6
  await expect(screen.getByRole('button', { name: 'Add to cart' })).toHaveCount(6);
  await expect(browser.locator('.inventory_item')).toHaveCount(6);
  // 每件含价格（抽查整体存在性：价格节点 × 6）
  await expect(browser.locator('.inventory_item_price')).toHaveCount(6);
});

test('TC-08 商品列表：价格从低到高排序', async ({ app, screen, browser }) => {
  await login(app, screen);
  await screen
    .getByRole('combobox', { name: 'Sort products' })
    .selectOption({ label: 'Price (low to high)' });
  await expect(screen.getByRole('combobox', { name: 'Sort products' })).toHaveValue('lohi');
  const prices = await browser.locator('.inventory_item_price').allTextContents();
  expect(prices).toEqual(['$7.99', '$9.99', '$15.99', '$15.99', '$29.99', '$49.99']);
});

test('TC-09 商品列表：价格从高到低排序', async ({ app, screen, browser }) => {
  await login(app, screen);
  await screen
    .getByRole('combobox', { name: 'Sort products' })
    .selectOption({ label: 'Price (high to low)' });
  await expect(screen.getByRole('combobox', { name: 'Sort products' })).toHaveValue('hilo');
  const prices = await browser.locator('.inventory_item_price').allTextContents();
  expect(prices).toEqual(['$49.99', '$29.99', '$15.99', '$15.99', '$9.99', '$7.99']);
});

test('TC-10 商品列表：名称 Z→A 排序', async ({ app, screen, browser }) => {
  await login(app, screen);
  await screen
    .getByRole('combobox', { name: 'Sort products' })
    .selectOption({ label: 'Name (Z to A)' });
  await expect(screen.getByRole('combobox', { name: 'Sort products' })).toHaveValue('za');
  // 第一个商品应是 Test All The Things (T-Shirt)
  await expect(browser.locator('.inventory_item_name').first()).toHaveText(
    'Test.allTheThings() T-Shirt (Red)',
  );
});
