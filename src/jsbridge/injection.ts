import type { AppInfo } from './protocol'

/** 容器要模拟的通道形态。鸿蒙与 Android 同构，都走 JSBridge.handle。 */
export type BridgePlatform = 'android' | 'ios'

/**
 * 注入到 WebView 的通道垫片。
 *
 * RN WebView 的真实通道是 `window.ReactNativeWebView.postMessage`，
 * 这里按 `@wapri/gjsbridge` 的三端约定包一层：
 * - android / harmonyos：`window.JSBridge.handle(JSON)`
 * - ios：`window.webkit.messageHandlers[method].postMessage(JSON)`
 *
 * 两种形态都会把报文归一化成 `{ method, params, requestId }` 再交给 Native。
 */
const TEMPLATE = String.raw`
(function (platform, appInfo) {
  if (window.__JSBRIDGE_INJECTED__) return;
  window.__JSBRIDGE_INJECTED__ = true;

  function post(payload) {
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  function forward(raw, channel) {
    var body = typeof raw === 'string' ? raw : JSON.stringify(raw);
    if (!post({ kind: 'request', channel: channel, body: body })) {
      console.warn('[jsbridge] ReactNativeWebView 未就绪，请求被丢弃');
    }
  }

  if (platform === 'ios') {
    window.webkit = window.webkit || {};
    window.webkit.messageHandlers = new Proxy(
      {},
      {
        get: function (target, key) {
          if (typeof key !== 'string' || key === 'then' || key === 'toJSON') return undefined;
          if (!target[key]) {
            target[key] = {
              postMessage: function (message) {
                var payload = {};
                try {
                  payload = JSON.parse(message) || {};
                } catch (error) {
                  console.warn('[jsbridge] 非法报文', message);
                  return;
                }
                forward(
                  { method: key, params: payload.params || {}, requestId: payload.requestId },
                  'ios'
                );
              }
            };
          }
          return target[key];
        }
      }
    );
  } else {
    window.JSBridge = {
      handle: function (message) {
        forward(message, 'android');
      }
    };
  }

  window.__BRIDGE_ENV__ = { platform: platform, app: appInfo, injectedAt: Date.now() };
})(%%PLATFORM%%, %%APP_INFO%%);
true;
`

export function buildInjectionScript(platform: BridgePlatform, appInfo: AppInfo): string {
  return TEMPLATE.replace('%%PLATFORM%%', JSON.stringify(platform)).replace('%%APP_INFO%%', JSON.stringify(appInfo))
}
