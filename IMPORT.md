# Excel 导入式端到端自动化测试 —— 使用指南

> 一句话：**把测试用例写在 Excel 里 → 导入 → 自动生成测试代码 → 自动执行 → 结果回写 Excel**。
> 测试人员只需维护 Excel（自然语言），不需要写代码、不需要定位元素。

基于 [tester-army/e2e](https://github.com/tester-army/e2e) 框架实现，本文档以
[https://www.saucedemo.com](https://www.saucedemo.com) 为完整示例。

---

## 1. 工作原理

```
┌──────────────────┐   ┌───────────────┐   ┌──────────────┐   ┌──────────────┐
│ ① 测试用例 Excel  │ → │ ② 导入+翻译    │ → │ ③ 自动执行    │ → │ ④ 结果回写    │
│ 纯自然语言描述    │   │ NL → e2e 代码  │   │ npx e2e run  │   │ Excel 状态列  │
└──────────────────┘   └───────────────┘   └──────────────┘   └──────────────┘
```

- **①** 你只在 Excel 里描述"测什么"（步骤和预期都是大白话）
- **②** 翻译层把每行用例变成一条 e2e 测试（定位器从运行时语义树获取，不靠猜）
- **③** 框架驱动真实浏览器执行（可选启用 AI agent 步骤）
- **④** 通过的用例在 Excel 里标"已实现"并着绿色，概览表自动重算

## 2. Excel 模板规范（9 列）

参考本目录的 [SauceDemo测试用例.xlsx](./SauceDemo测试用例.xlsx)：

| 列 | 名称 | 说明 | 示例 |
|---|---|---|---|
| A | 编号 | 唯一 ID，用于回写定位 | TC-01 |
| B | 模块 | 功能分组（用于统计/筛选） | 登录 |
| C | 用例名称 | 一句话概括 | 错误密码登录失败 |
| D | 优先级 | P0/P1/P2（P0=主路径冒烟） | P0 |
| E | 前置条件 | 执行前的状态 | 已到登录页 |
| F | 测试步骤 | **自然语言**操作描述 | 输入错误密码，点击 Login |
| G | 预期结果 | **自然语言**验收标准 | 显示红色报错，停留登录页 |
| H | 建议实现方式 | 确定性 / AI 混合 / AI 语义断言 | 确定性 |
| I | 状态 | 已实现 / 待实现（流水线回写） | 待实现 |

> 写 G 列的小技巧：把"结构性验证"和"功能性验证"分开写（如"地址栏含 inventory；
> 页面标题显示 Products"），翻译层会转成双断言，更稳。

## 3. 给一个新网站接入（三步）

### 3.1 配置 target（e2e.config.ts）

```ts
{
  name: '你的网站名',
  engine: web(),
  app: { url: 'https://你的网站' },
},
```

### 3.2 准备 Excel

按第 2 节模板填写；没有 Excel 也可以直接口述用例清单，先帮你生成 Excel 再走流程。

### 3.3 触发导入

对 AI 助手说一句话即可：

```
"导入 SauceDemo测试用例.xlsx 前 10 条"
"导入购物车模块"          ← 按 B 列筛选
"导入所有 P0"             ← 按 D 列筛选
"导入 TC-11 到 TC-23"     ← 按编号范围
```

之后全自动：翻译 → 首跑 →（如有失败，读 trace 语义树修正定位器）→ 复跑全绿 → 回写 Excel。

## 4. 完整实战示例（SauceDemo 前 10 条）

| 项 | 结果 |
|---|---|
| 导入范围 | TC-01 ~ TC-10（登录×4 / 导航×2 / 商品列表×4） |
| 生成文件 | [tests/saucedemo-import.e2e.ts](./tests/saucedemo-import.e2e.ts) |
| 首跑 | 4 绿 6 红（原因全部由 trace 定位，见下节） |
| 终跑 | **10/10 全绿，29s，零 AI 调用** |
| Excel 回写 | 8 条"待实现"→"已实现"，概览自动重算为 13/23 |

## 5. 翻译层的核心规则（为什么不用人定位元素）

**元素定位永远来自运行时语义树，不靠经验猜。** 首跑故意允许失败，失败时
`.e2e/results/<用例>/trace.md` 会给出：

- 完整语义树（`#id 角色 "可访问名"` 一行一个元素）——**照抄前两个字段就是定位器**
- "Closest to what the locator asked for"——直接建议正确控件名

SauceDemo 实战中靠它纠正的四个"想当然"：

| 想当然 | 语义树真相 |
|---|---|
| 错误提示用 `getByTestId('error')` | 实际是 `getByRole('alert')`（data-test≠data-testid） |
| 侧边菜单项是 link | 实际是 **button**（`button "Logout"`） |
| 商品名 "Test All The Things (T-Shirt)" | 实际 "Test.allTheThings() T-Shirt (Red)" |
| 菜单打开后直接数商品按钮 | 菜单遮挡导致计数 5/6——先 Close Menu 再断言 |

## 6. 三种实现粒度（Excel 的 H 列如何选）

| H 列值 | 翻译成 | 成本 | 适用 |
|---|---|---|---|
| 确定性 | `screen.getByRole` + `expect` | 0（无模型） | 默认首选；反向用例、精确金额、排序 |
| AI 混合 | `agent.act('中文目标')` + `expect` | 首次调模型，录制后回放≈0 | 多步流程、易变控件（如标签芯片） |
| AI 语义断言 | `agent.assert('中文判断')` | 每次约 2 次调用 | "布局合理"这类目测型检查，每用例 ≤1 个 |

需要 AI 粒度时配置模型（本项目的 GLM 配置见 [README.md](./README.md) §4.3），
并记住两条：act 后必跟 expect（触发缓存）；复杂流程用 `agentContext` 预注入页面规则。

## 7. 运行命令速查

```bash
# 全量（所有用例文件）
npx e2e run --target saucedemo

# 只跑导入的用例
npx e2e run saucedemo-import --target saucedemo

# 单条（按编号）
npx e2e run saucedemo-import --grep 'TC-06'

# 可见浏览器观察 / 失败时看逐步报告
npx e2e run --headed --target saucedemo
# 报告位置：.e2e/results/<用例>/trace.md
```

## 8. 常见问题

**Q: Excel 改了用例怎么办？**
重跑一次"导入 XX"即可——生成层按 Excel 当前内容重新翻译，跑绿后回写。

**Q: 页面改版导致用例挂了？**
确定性用例：读 trace 语义树更新定位器（多半只改一行）。AI 混合用例：多数情况
回放缓存自愈（按角色重找控件）；真失效才由 AI 重新探索并重新录制。

**Q: 换个网站能用吗？**
能。换 target + 换 Excel 即可，流程完全一致。被测站需要：可访问（登录页可达）、
测试数据可控（注册/造数接口或固定测试账号）。

**Q: 敏感信息怎么处理？**
账号密码走环境变量或 Excel 外的本地配置，不进 git（本项目 .gitignore 已覆盖）。

## 9. 相关文件

| 文件 | 作用 |
|---|---|
| [SauceDemo测试用例.xlsx](./SauceDemo测试用例.xlsx) | 用例源（导入输入 + 状态回写目标） |
| [tests/saucedemo-import.e2e.ts](./tests/saucedemo-import.e2e.ts) | 导入流水线生成的测试文件 |
| [tests/saucedemo.e2e.ts](./tests/saucedemo.e2e.ts) | 手写教学用例（含 AI 混合示范） |
| [README.md](./README.md) | 框架概念 / 环境搭建 / 成本模型 |
| [REPORT.md](./REPORT.md) | RealWorld 实战全记录 |
