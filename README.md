# SauceDemo × e2e 端到端测试项目（Excel 导入式）

用 [tester-army/e2e](https://github.com/tester-army/e2e) 框架对公开练习靶场
[https://www.saucedemo.com](https://www.saucedemo.com) 做端到端测试的独立项目。

**本项目特色：测试用例维护在 Excel 里（纯自然语言），通过"导入流水线"自动生成测试代码、
自动执行、结果自动回写 Excel**——测试人员不需要写代码和定位元素。

- 📥 Excel 导入流水线使用指南：[IMPORT.md](./IMPORT.md)
- 📊 用例源与进度：[SauceDemo测试用例.xlsx](./SauceDemo测试用例.xlsx)
- 🧪 Excel 导入用例：[tests/saucedemo-import.e2e.ts](./tests/saucedemo-import.e2e.ts)
- 🤖 AI 混合教学用例：[tests/saucedemo.e2e.ts](./tests/saucedemo.e2e.ts)

姊妹项目（RealWorld 本地全栈实战）位于 `../e2e-demo`，互不依赖。

---

## 1. 这个框架是什么

e2e 是一个**混合范式**的 E2E 测试框架（TypeScript，Web 引擎基于 Playwright，另有 iOS/Android 移动引擎）。它的核心思想：一个测试里可以自由混搭三种粒度——

| 粒度 | 写法 | 成本 | 适用 |
|---|---|---|---|
| **确定性步骤/断言** | `screen.getByRole(...)` + `expect(...)` | 0（无模型） | 稳定流程、精确结果校验 |
| **AI 目标驱动** | `agent.act('自然语言目标')` | 首次调模型，**验证通过后录制回放，之后 ≈0 调用** | 易变流程、不想写定位器的场景 |
| **AI 语义判断** | `agent.assert('自然语言判断')` | 每次固定 ~2 次模型调用，**不缓存** | 难以枚举的检查（布局合理、状态正确） |

一个典型测试（本项目的 AI 用例原文）：

```ts
test('AI 完成加购并结账下单，全流程成功', async ({ app, agent, screen, browser }) => {
  await login(app, screen);                                        // 确定性：0 token
  await agent.act('把名为 Sauce Labs Backpack 的商品加入购物车');   // AI 驱动，可缓存回放
  await expect(screen.getByRole('button', { name: 'Cart, 1 items' })).toBeVisible(); // 断言+触发录制
  await agent.act('完成结账：名字 Ada，姓氏 Lovelace，邮编 12345'); // 长流程交给 AI
  await expect(browser).toHaveURL(/checkout-complete\.html/);      // 结果锁定
  await agent.assert('页面显示订单成功完成，带有确认信息');          // 目测型总把关
});
```

### 缓存/回放机制（框架的经济核心）

`agent.act` 后面**必须跟一个确定性验证**（`expect` / `locator.waitFor` 等），验证通过后该 act 的动作序列被录制到 `.e2e/cache/`。下次运行直接**回放**（≈0 模型调用）；回放按角色/名称**重新查找**控件，UI 小改版不影响回放（自愈）。本项目实测：完整下单用例首次 77s/64k tokens，回放后 **12.6s/1.3k tokens**。

### 成本速查

| 调用 | 模型调用次数 | 缓存 |
|---|---|---|
| `agent.act` | ≤ 25（默认上限） | ✅ 录制后回放为 0 |
| `agent.assert` | 2 | ❌ |
| `agent.extract` / `waitFor` | 2 / ≤ 25 | ❌ |
| 确定性步骤 | 0 | — |

**省钱策略**：默认写确定性断言；act 用在高波动区且必跟 expect；assert 每个用例最多留一个。

## 2. 项目结构

```
e2e_saucedemo-demo/
├── README.md                       # 本文件
├── IMPORT.md                       # Excel 导入流水线指南（模板规范/接入三步/FAQ）
├── SauceDemo测试用例.xlsx          # 用例源（23 条，9 列，状态回写目标）
├── e2e.config.ts                   # target（saucedemo）+ GLM 模型配置
├── package.json                    # test:e2e = e2e run
└── tests/
    ├── saucedemo-import.e2e.ts     # Excel 导入的 TC-01~10（纯确定性，28s）
    └── saucedemo.e2e.ts            # AI 混合用例 ×4（含中文 agent.act/assert 示范）
```

运行产物在 `.e2e/`（gitignore）：`results/<用例>/trace.md` 逐步报告、`cache/` 回放缓存。

## 3. 被测系统

```
浏览器 (Chromium, e2e Web 引擎)
   │
   ▼
https://www.saucedemo.com   公开练习靶场，无需本地环境
   模拟电商全流程：登录 → 商品列表 → 购物车 → 结账 → 订单完成
   公开测试账号：standard_user / secret_sauce
   （另有 locked_out_user 等特殊账号用于反向用例）
```

测试数据说明：靶场数据每次会话重置；用例自含前置（加购 → 重置），无跨用例依赖。

## 4. 如何运行

```bash
npm install

# 可选环境变量
export GLM_API_KEY=<你的 GLM key>      # 只有 AI 用例需要；导入的 10 条是纯确定性
export PLAYWRIGHT_BROWSERS_PATH=<浏览器目录>  # 沙箱环境需要，普通终端可省

npx e2e run                             # 全量 14 条（2 个文件）
npx e2e run saucedemo-import            # 只跑 Excel 导入的 10 条（零模型，28s）
npx e2e run --grep 'TC-06'              # 按编号跑单条
npx e2e run --headed                    # 可见浏览器窗口，观察 agent 操作
npx e2e run --debug                     # 每步的耗时/模型调用/token/cache 占比表
npx e2e run --no-cache                  # 禁用回放缓存（评估新模型时用）
```

### 当前模型配置

```ts
// e2e.config.ts
const glm = createAnthropic({
  baseURL: 'https://open.bigmodel.cn/api/anthropic/v1',  // 必须带 /v1
  apiKey: process.env.GLM_API_KEY,
});
agents: { default: { model: glm('glm-5.3') } },
```

> GLM 同一 key 在 Anthropic 兼容端点可用、在 OpenAI 兼容端点 `/paas/v4` 报余额不足。
> 中文自然语言指令（act/assert）实测完全可用。换模型只改这一处。

## 5. 测试用例一览

**Excel 导入（TC-01~10，纯确定性，全绿）**

| # | 用例 | 验证点 |
|---|---|---|
| TC-01 | 有效账号登录成功 | URL 进 inventory + 标题 Products |
| TC-02 | 错误密码登录失败 | 停留登录页 + alert 报错 "do not match" |
| TC-03 | 空表单直接提交 | alert "Username is required" |
| TC-04 | 被锁定账号无法登录 | alert "locked out" |
| TC-05 | 侧边菜单打开与登出 | 回到登录页 |
| TC-06 | 菜单重置应用状态 | 徽章清空 + 按钮恢复（需刷新，见 §7） |
| TC-07 | 六个商品全部展示 | 加购按钮/商品卡片/价格 各 ×6 |
| TC-08 | 价格从低到高排序 | 价格序列 toEqual 整组比较 |
| TC-09 | 价格从高到低排序 | 反向序列 |
| TC-10 | 名称 Z→A 排序 | 第一项 "Test.allTheThings() T-Shirt (Red)" |

**AI 混合（教学示范，全绿）**

| 用例 | 混搭方式 |
|---|---|
| 有效账号登录成功，进入商品列表页 | 纯确定性 |
| AI 完成加购并结账下单，全流程成功 | 确定性登录 + act×2 + expect×3 + assert×1 |
| AI 移除商品后购物车清空 | act 加购/移除 + `not.toBeVisible()` 负向断言 |
| 排序下拉选择价格从低到高 | selectOption + allTextContents 序列比较 |

**进度：13/23 已实现**（Excel 概览页实时统计）。继续导入：说"导入购物车模块"等即可。

## 6. 失败了怎么排查

每次失败在 `.e2e/results/<用例>/trace.md` 生成报告，四大武器：

- 逐步骤执行结果 + 每步后的**快照 diff**（`added button "Logout"` 级别）
- 失败瞬间的**完整语义树**——每行 `#id 角色 "可访问名"`，**照抄前两个字段就是定位器**
- **网络警告**（区分：被测站自身埋点 401 是噪声；`POST /api 404` 才是你的问题）
- locator 找不到时的 **"Closest to what the locator asked for"**——直接给正确控件名

本项目 TC-01~10 首跑 6 红，全部靠语义树一次定位修正（详见下节对照表）。

## 7. 写用例的要点（本项目实测）

1. **定位永远来自语义树，不靠猜**——本项目四个"想当然"全被树纠正：

   | 想当然 | 语义树真相 |
   |---|---|
   | 错误提示 `getByTestId('error')` | `getByRole('alert')`（data-test ≠ data-testid） |
   | 侧边菜单项是 link | 实际是 **button**（`button "Logout"`） |
   | 商品名 "Test All The Things (T-Shirt)" | "Test.allTheThings() T-Shirt (Red)" |
   | 菜单开着数商品按钮 | 菜单遮挡少 1——先 Close Menu 再断言 |

2. **act 措辞口诀：指名道姓 + 完整意图**（"把名为 X 的商品**从购物车中**移除"）
3. **每个 act 后必跟 expect**——锁定结果 + 触发录制缓存
4. **agent.assert 措辞指向语义树可辨识元素**；答案在像素里时加 `{ vision: true }`；它是非确定性的，关键用例配 `retries: 2`
5. **可精确验证的事实用 expect 不用 assert**："购物车清空" = `not.toBeVisible()`（0 token）
6. **被测站怪癖是发现不是障碍**：TC-06 发现 Reset 后按钮文字不刷新，需重载才是最终状态（用例注释已记录）
7. **"排序类"断言套路**：`allTextContents()` 抓有序数组 + `toEqual` 整组比较

## 8. Excel 导入流水线（本项目核心玩法）

```
① Excel 用例（自然语言步骤/预期）
      ↓  说"导入前 10 条 / 导入购物车模块 / 导入所有 P0"
② 自动翻译成 e2e 测试代码
      ↓  首跑 → 失败时读 trace 语义树修正定位 → 复跑
③ 自动执行（npx e2e run）
      ↓
④ 结果回写 Excel（状态列绿底 + 概览重算）
```

模板规范、新网站接入三步、FAQ 见 **[IMPORT.md](./IMPORT.md)**。

## 9. 常用参考

```bash
npx e2e guide                  # 官方 skill 总览
npx e2e guide writing-tests    # 写测试：fixtures/locator/断言
npx e2e guide agent            # agent 步骤：模型/预算/缓存
npx e2e guide mcp              # 给编码 agent 活浏览器会话，边走流程边写测试
npx e2e guide running          # CLI/CI/报告
npx e2e guide debugging        # 失败排查
node_modules/e2e/docs/         # 全量离线文档
```
