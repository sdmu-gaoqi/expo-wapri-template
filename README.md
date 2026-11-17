# Expo 容器模板

一个可以直接复用的 App 容器骨架：**原生能力用 Expo 实现**，**H5 通过 JSBridge 协议调用**。

协议与 [`sdmu-gaoqi/wapri`](https://sdmu-gaoqi.github.io/wapri/jsbridges) 的 `@wapri/gjsbridge` 对齐：
三端通道形态、`requestId` 事务、超时、`BridgeError`、`onNativeEvent` 事件通道。

## 能力清单

| 能力                               | 原生页面                   | 桥接方法                        | Native 方法                                       |
| ---------------------------------- | -------------------------- | ------------------------------- | ------------------------------------------------- |
| 相机（取景器 + 拍照 / 相册）       | `src/app/camera.tsx`       | `takePhoto`                     | `takePhoto`                                       |
| 拨打电话                           | `src/app/phone.tsx`        | `makePhoneCall`                 | `makePhoneCall`                                   |
| 定位（坐标 + 逆地理编码）          | `src/app/location.tsx`     | `getLocation`                   | `getLocation`                                     |
| 文件预览（图片 / 文本 / 系统打开） | `src/app/file-preview.tsx` | `previewFile`                   | `previewFile`                                     |
| 文件上传（multipart + 进度）       | `src/app/file-upload.tsx`  | `uploadFile`                    | `uploadFile`                                      |
| 选择文件                           | —                          | `chooseFile`                    | `chooseFile`                                      |
| 安全区域 / 能力检测 / 关闭页面     | —                          | `getSafeArea` `canIUse` `close` | `getSafeArea` `permission.caniuse` `closeWebview` |

H5 演示页在 `assets/web/index.html`，通过 `src/app/webview.tsx` 里的 WebView 加载。

## 快速开始

```bash
npm install
npm run android   # 或 npm run ios
```

> 相机、定位、文件选择需要真机或带传感器的模拟器；iOS 模拟器没有电话 App，拨号会失败。

## 目录结构

```
assets/web/index.html      H5 演示页（内含 jsbridge 客户端精简实现，自包含）
src/app/                   expo-router 页面：首页 + 5 个原生能力 + WebView 容器
src/components/            相机宿主、预览宿主、UI 基础组件
src/jsbridge/
  protocol.ts              报文/信封/错误码/数据结构
  registry.ts              业务方法 → Native 方法映射
  handlers.ts              所有 Native 方法实现
  native.ts                容器侧分发：收报文、校验、回包、下发事件
  injection.ts             注入到 WebView 的三端通道垫片
  interactions.ts          「方法调用 ↔ 原生界面」的 Promise 队列
  media.ts                 文件选择/下载/上传/缩略图等公共能力
  runtime.ts               安全区、closeWebview、事件下发等运行期状态
```

## 协议

### 三端通道

| 设备    | Native 注入的通道                                   | 报文                            |
| ------- | --------------------------------------------------- | ------------------------------- |
| iOS     | `window.webkit.messageHandlers[method].postMessage` | `{ params, requestId }`         |
| Android | `window.JSBridge.handle`                            | `{ method, params, requestId }` |
| 鸿蒙    | `window.JSBridge.handle`（与 Android 同构）         | `{ method, params, requestId }` |

RN WebView 的真实通道是 `window.ReactNativeWebView.postMessage`，`src/jsbridge/injection.ts`
在页面加载前把它包装成上表的两种形态，H5 侧按通道形状自动识别，无需感知宿主实现。

`src/app/webview.tsx` 顶部可以在 **Android / iOS** 之间切换，用来观察两种报文差异：

```js
// Android / 鸿蒙
window.JSBridge.handle(
  JSON.stringify({
    method: 'makePhoneCall',
    params: { phoneNumber: '10086' },
    requestId: 'BridgeHandle…',
  }),
)

// iOS（method 由 messageHandlers 的键表达）
window.webkit.messageHandlers.makePhoneCall.postMessage(
  JSON.stringify({
    params: { phoneNumber: '10086' },
    requestId: 'BridgeHandle…',
  }),
)
```

### 回包与事件

```js
// 一次性请求的回包
window.onNativeMessage(JSON.stringify({ requestId, code: 0, message: 'success', data }))

// 与请求分离的事件通道
window.onNativeEvent('uploadProgress', JSON.stringify({ loaded, total, percent }))
```

`code === 0` 表示成功，其余按 `BridgeError` 处理，错误码见 `BridgeCode`：

| code | 含义                |
| ---- | ------------------- |
| 0    | 成功                |
| 400  | 参数错误            |
| 403  | 权限被拒绝          |
| 404  | Native 未实现该方法 |
| 500  | Native 执行失败     |
| 4001 | 用户取消            |

### H5 调用

```js
const asset = await jsbridge.takePhoto({ source: 'camera' }) // → MediaAsset
await jsbridge.makePhoneCall({ phoneNumber: '10086' }) // → undefined
const geo = await jsbridge.getLocation() // → GeoInfo
await jsbridge.previewFile({ url, name, mimeType }) // → { action, uri }
const result = await jsbridge.uploadFile({ url, filePath }) // → UploadResult
```

方法与参数见 `src/jsbridge/registry.ts`，H5 侧的 `apiRegistry` 副本在 `assets/web/index.html`。
真实项目里的 H5 可以直接用 `@wapri/gjsbridge`，容器把通道注入好之后行为一致。

## 新增一个 Native 方法

1. `src/jsbridge/protocol.ts`：把方法名加进 `NativeMethod` 联合类型。
2. `src/jsbridge/handlers.ts`：写实现并注册到 `handlers`，key 用 Native 方法名。
3. `src/jsbridge/registry.ts`：加业务方法 → Native 方法的映射（需要单独超时就在这里配置）。
4. `assets/web/index.html`：在 H5 的 `apiRegistry` 里加同名条目，即可 `jsbridge.xxx(params)`。

`canIUse` 直接读 `handlers` 的 key，新增方法无需额外登记。

## 权限与配置

`app.json` 已按能力挂好 config plugin，`npx expo prebuild` 会自动写入原生清单：

- `expo-camera` → `NSCameraUsageDescription` / `android.permission.CAMERA`
- `expo-image-picker` → 相册读取权限
- `expo-location` → 前台定位权限
- `expo-document-picker` → 文件选择（iOS 含 iCloud entitlement）

## 代码规范

统一用团队包 `@wagq/lint-ox`（oxlint + oxfmt，Rust 工具链，替代 ESLint + Prettier）。

```bash
npm run lint          # oxlint，规则来自 .oxlintrc.json
npm run lint:fix      # 自动修复（花括号等）
npm run format        # oxfmt 写回
npm run format:check  # 只检查，CI 用
npm run check         # typecheck + lint + format:check
```

- **oxlint**：`.oxlintrc.json` 通过 `extends` 引用 `@wagq/lint-ox/oxlint/react.json`（typescript / unicorn / react / jsx-a11y / import / nextjs），并补了 Expo 的忽略目录（`.expo`、`android`、`ios`、`dist`）。oxlint 的 `extends` 只认相对配置文件的路径，所以写成 `./node_modules/...`。
- **oxfmt**：包里没有 `extends`，直接在脚本里用 `-c ./node_modules/@wagq/lint-ox/oxfmt.json` 指定。参数与团队一致：120 列、单引号、无分号、`singleAttributePerLine`。
- **`.prettierignore`**：oxfmt 默认读取 `.gitignore` 与 `.prettierignore`，用它把 `assets/web/` 排掉——那份 H5 演示页是手工排版的紧凑写法，`singleAttributePerLine` 会把每个标签摊成多行，反而难读。
- **编辑器**：装 Oxc 扩展 `oxc.oxc-vscode`，`.vscode/settings.json` 已配好默认格式化器与保存时修复。

新增依赖走 `npm i -D`；`oxlint` / `oxfmt` 的版本要落在 `@wagq/lint-ox` 的 peer 范围内（当前 `oxlint ^1.90`、`oxfmt ^0.75`），升级本包时一并升。

## 说明与限制

- **上传接口**：默认指向 `https://httpbin.org/post`，仅用于回显验证，生产请换成自己的接口。
- **multipart 文件名**：`expo-file-system` 的 `File.upload` 用缓存文件自身的名字，服务端会看到带时间戳前缀的文件名；需要严格控制时可在上传前先复制成目标文件名。
- **H5 资源**：`assets/web/index.html` 是 Metro 静态资源，通过 `file://` 加载，因此 WebView 打开了 `allowFileAccess`，iOS 额外设置了 `allowingReadAccessToURL`。加载远程 H5 时这些开关可以关掉。
- **安全**：注入脚本只暴露 `JSBridge.handle` / `webkit.messageHandlers` 两个入口，没有开放任意脚本执行能力；`injectJavaScript` 只用于回包。
- **类型检查**：`npm run typecheck`。

## 验证

```bash
npm run check                            # typecheck + lint + format:check
npx expo export --platform android       # Metro 打包通过，html 资源随包导出
```
