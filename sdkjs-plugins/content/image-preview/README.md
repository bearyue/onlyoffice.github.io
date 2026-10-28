# Image Preview / 图片放大预览

Preview pictures from a document in a separate ONLYOFFICE plugin window. Use the image context menu or select a picture and click the floating magnifier button.

## Features

- **View larger image** from the image context menu.
- A floating magnifier appears in the editor's fixed action area when exactly one image is selected.
- Mouse-wheel zoom from 5% to 1200%, drag to pan, fit to window, and 100% view.
- Previous/next arrows and Left/Right keys navigate from the currently selected image. Buttons are disabled at either end.
- Resizable preview window, icon-only maximize/restore control, and Escape to close.

Navigation changes which image is selected in the document. It does not resize, replace, or rearrange document images. Ordering follows the editor's image navigation API, rather than a custom visual-layout sort.

## Compatibility

The configuration requires ONLYOFFICE 10.0.0 or later and enables the plugin for the document editor (`word`). Development and user trials have been performed with Windows Desktop Editors 10.0.0.169. Browser-based editors, other operating systems, and older editor versions have not been validated.

The plugin currently uses the `system` type to start automatically. Its Chinese interface and system-plugin behavior are development choices to review before marketplace submission.

## Manual installation

1. ZIP the contents of this directory, with `config.json` at the archive root.
2. Change the archive extension from `.zip` to `.plugin`.
3. In Desktop Editors, open **Plugins → Plugin Manager → Install plugin manually** and select the archive.
4. Save any open documents and restart Desktop Editors after updating an existing installation.
5. Select one picture and click the floating magnifier, or right-click the picture and choose **查看大图**.

## 中文使用说明

选中一张图片后，点击编辑器固定浮动区域中的放大镜，或右键图片选择“查看大图”。预览中可滚轮缩放、按住鼠标左键拖动，并用两侧箭头或键盘左右方向键切换图片。

窗口边框支持拖动调整大小，标题栏方框图标用于最大化和还原。最大化受 ONLYOFFICE 编辑器区域限制，并非系统全屏。浮动按钮位于编辑器固定区域，不跟随图片定位，也不支持鼠标悬停或双击图片直接触发。

## External resources and privacy

Both HTML entry points load the official plugin SDK from `https://onlyoffice.github.io/sdkjs-plugins/v1/plugins.js`, so that address must be reachable. The plugin's application code does not upload document text or image data to an external service. Images are obtained through the editor's plugin API and displayed in the preview window.

## Source files

| File | Purpose |
| --- | --- |
| `config.json` | Plugin identity, editor compatibility, and registered events |
| `background.html`, `background.js` | Automatic startup, floating/context-menu entries, editor calls, and preview lifecycle |
| `viewer.html`, `preview.js` | Image viewer, zoom/pan, keyboard controls, and window messages |
| `icons/` | Light and dark theme action icons |

## Publication status

This directory is an initial source contribution to a personal fork. It is not yet registered in `store/config.json` or submitted for official marketplace review. Marketplace metadata, author information, store artwork, sample-document screenshots, localization, and broader compatibility validation remain to be prepared.

## License

See the repository's root [LICENSE](../../../LICENSE).
