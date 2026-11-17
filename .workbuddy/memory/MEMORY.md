# 项目约定

## Expo 容器模板（JSBridge）

- 技术栈：Expo SDK 58 / RN 0.88 / React 19.3 / expo-router（`src/app`），TypeScript strict。
- 路径别名：`@/*` → `src/*`，`@/assets/*` → `assets/*`（Metro 侧走相对路径更稳）。
- 协议以 `@wapri/gjsbridge` 为基准，改协议时同步三处：
  1. `src/jsbridge/protocol.ts`（类型/错误码）
  2. `src/jsbridge/registry.ts` + `handlers.ts`（映射与实现）
  3. `assets/web/index.html` 里的 `apiRegistry`（H5 副本）
- 新增 Native 方法四步：`NativeMethod` 联合类型 → `handlers` 注册 → `registry` 映射 → H5 侧 registry。
- 业务方法名与 Native 方法名可以不同（如 `close` → `closeWebview`、`canIUse` → `permission.caniuse`）。
- 交互型能力（需要弹界面）不要塞进 handler，走 `interactions.ts` 的队列 + 根布局 Host。
- H5 只能拿到 URI，不能直接读沙盒文件；需要展示图片时必须返回 `thumbnail`（data URI）。

## 代码规范（@wagq/lint-ox）

- 命令：`npm run lint` / `lint:fix` / `format` / `format:check` / `check`（后者串 typecheck + lint + format:check）。
- `.oxlintrc.json` 继承 `./node_modules/@wagq/lint-ox/oxlint/react.json`（RN 用 react 预设，不要用带 vue 的 recommended）。
- oxfmt 无 `extends`，脚本里显式 `-c ./node_modules/@wagq/lint-ox/oxfmt.json`；编辑器侧靠 `oxc.fmt.configPath` 指向同一份。
- 风格：120 列 / 单引号 / **无分号** / `singleAttributePerLine` / LF。
- `.prettierignore` 排掉 `assets/web/`（手写紧凑 H5 页）与 `.workbuddy/`；新增手写静态页同样加进去。
- `.gitattributes` 固定 `eol=lf`，对齐 oxfmt 的 `endOfLine: "lf"`。
- preset 带 React Compiler 规则：**effect 内不要同步 setState**，用按 key/uri 派生状态的写法。
- 资源导入用顶层 `import x from '*.html'`，不要 `require()`（触发 `typescript/no-require-imports`）。
- 花括号必须写全（`eslint/curly: all`）。

## 环境注意

- node_modules 批量删除会被 safe-delete 钩子拦截（trash 报 "Some operations were aborted"）。需要重装时：整体 rename 挪走 → `npm install`，不要用 `npm ci` / `rm -rf`。
