import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { createAnthropic } from '@ai-sdk/anthropic';

// GLM 5.3 via the Anthropic-compatible endpoint（AI 步骤可选；
// 纯确定性用例不需要模型，仅需删掉 agents 段或忽略 GLM_API_KEY）
const glm = createAnthropic({
  baseURL: 'https://open.bigmodel.cn/api/anthropic/v1',
  apiKey: process.env.GLM_API_KEY,
});

export default {
  targets: [
    {
      name: 'saucedemo',
      engine: web(),
      app: { url: 'https://www.saucedemo.com' },
    },
  ],
  agents: { default: { model: glm('glm-5.3') } },
} satisfies E2EConfig;
