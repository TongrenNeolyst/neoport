# Tests

测试代码目录，包含 E2E 测试和验收脚本。

## 目录结构

```
tests/
├── e2e/                    # E2E 测试用例
│   ├── *.spec.ts          # Playwright 测试文件
│   └── fixtures/          # 测试数据
├── scripts/               # 测试辅助脚本
│   └── verify/            # 验收脚本
├── playwright.config.ts   # Playwright 配置
├── tsconfig.json          # TypeScript 配置
└── package.json           # 依赖管理
```

## 运行测试

### E2E 测试

```bash
cd tests
pnpm test                  # 运行所有测试
pnpm test:headed           # 显示浏览器窗口
pnpm test:ui               # UI 模式
pnpm test:report           # 查看测试报告
```

### 验收脚本

```bash
cd tests
node scripts/verify/verify-db-admin-and-rls.mjs
```

## 输出目录

测试输出和临时文件写入 `temp/e2e/`（不提交到 git）。

## 相关文档

- 测试规范：`docs/TESTING.md`
