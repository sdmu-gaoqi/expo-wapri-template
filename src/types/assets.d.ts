/** Metro 把 assets 里的 html 当成静态资源，require 返回资源 id。 */
declare module '*.html' {
  const assetId: number
  export default assetId
}
