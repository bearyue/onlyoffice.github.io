(function () {
  'use strict';
  var plugin = window.Asc.plugin;
  var previewWindow = null;
  var previewOpening = false;
  var pendingPreviewOpen = false;
  var floatingVisible = false, selectionTimer = null, selectionCheckRunning = false, selectionRevision = 0;

  function setFloatingButton(visible) {
    if (floatingVisible === visible) return;
    floatingVisible = visible;
    // 用空列表移除按钮，避免客户端新建按钮时忽略 visible=false。
    plugin.executeMethod('AddFloatActionButtons', [{guid: plugin.guid, items: visible ? [{
      id: 'previewFloating', text: '', icons: 'icons/%theme-type%(light|dark)/preview.svg',
      hint: '查看选中的图片', disabled: false
    }] : []}]);
  }

  function refreshFloatingButton() {
    selectionRevision++;
    if (selectionTimer !== null) clearTimeout(selectionTimer);
    selectionTimer = null;
    if (previewWindow || previewOpening) return;
    selectionTimer = setTimeout(function () {
      selectionTimer = null;
      if (selectionCheckRunning || previewWindow || previewOpening) return;
      selectionCheckRunning = true;
      var revision = selectionRevision;
      plugin.callCommand(function () {
        var document = Api.GetDocument();
        if (!document) return false;
        var selected = document.GetSelectedDrawings();
        return !!(selected && selected.length === 1 && selected[0].GetClassType() === 'image');
      }, false, false, function (isImage) {
        selectionCheckRunning = false;
        if (pendingPreviewOpen) { pendingPreviewOpen = false; showPreview(); return; }
        if (previewWindow || previewOpening) return;
        if (revision !== selectionRevision) { refreshFloatingButton(); return; }
        setFloatingButton(isImage === true);
      });
    }, 80);
  }

  function maximizeButton(current) {
    return {id: 'previewMaximize', type: 'button', align: 'right', text: '',
      icons: 'icons/%theme-type%(light|dark)/' + (current.maximized ? 'restore.svg' : 'maximize.svg'),
      hint: current.maximized ? '还原窗口大小' : '最大化预览窗口'};
  }

  function updateWindowButtons(current) {
    plugin.executeMethod('UpdateWindowHeaderItem', [{guid: plugin.guid, frames: [{
      id: current.id,
      // 当前客户端更新既有标题栏按钮时不刷新图标，需要替换这个按钮。
      items: [{id: 'previewMaximize', removed: true}, maximizeButton(current)]
    }]}]);
  }

  function resizePreview(current, request) {
    if (!request || previewWindow !== current) return;
    var width = Number(request.width), height = Number(request.height);
    if (!(width > 0 && height > 0)) return;
    var size;
    if (request.action === 'toggleMaximize') {
      if (current.maximized) {
        size = current.restoreSize;
        current.maximized = false;
      } else {
        current.restoreSize = [width, height];
        // 编辑器会把尺寸限制在自己的可用区域内，避免弹窗超出编辑器。
        size = [Number(request.screenWidth) || 1920, Number(request.screenHeight) || 1080];
        current.maximized = true;
      }
    } else return;
    plugin.executeMethod('ResizeWindow', [current.id, size, [480, 320], [0, 0]]);
    updateWindowButtons(current);
  }

  function closePreview() {
    if (previewWindow) {
      plugin.executeMethod('CloseWindow', [previewWindow.id]);
      previewWindow = null;
      refreshFloatingButton();
    }
  }

  // 此函数由编辑器执行，只使用官方文档 API，不修改文档内容。
  function navigateImageCommand() {
    try {
      var selected = Api.GetDocument().GetSelectedDrawings();
      var image = selected && selected[0];
      if (!image || image.GetClassType() !== 'image') return {error: '未找到当前图片，请关闭后重新右键图片。'};
      var direction = Asc.scope.previewImageDirection;
      if (direction) {
        var target = direction < 0 ? image.GetPrevImage() : image.GetNextImage();
        if (!target) return {edge: true, canPrev: !!image.GetPrevImage(), canNext: !!image.GetNextImage()};
        // 必须替换原选区；默认 Select() 会追加选择，图片读取接口仍会返回原来的第一张。
        if (target.Select(true) === false) return {error: '无法选中目标图片。'};
        image = target;
      }
      return {canPrev: !!image.GetPrevImage(), canNext: !!image.GetNextImage()};
    } catch (error) {
      return {error: '当前图片不支持连续切换。'};
    }
  }

  function navigatePreview(current, request) {
    if (previewWindow !== current || current.navigating || !request || (request.direction !== -1 && request.direction !== 1)) return;
    current.navigating = true;
    window.Asc.scope.previewImageDirection = request.direction;
    plugin.callCommand(navigateImageCommand, false, false, function (navigation) {
      if (previewWindow !== current) return;
      if (!navigation || navigation.error || navigation.edge) {
        current.navigating = false;
        current.command('onPreviewNavigation', navigation || {error: '无法读取图片顺序。'});
        return;
      }
      plugin.executeMethod('GetImageDataFromSelection', [], function (data) {
        current.navigating = false;
        if (previewWindow !== current) return;
        current.command('onPreviewData', {
          src: data && data.src,
          error: data && data.src ? '' : '无法读取目标图片。',
          canPrev: navigation.canPrev, canNext: navigation.canNext
        });
      });
    });
  }

  function showPreview() {
    if (previewOpening) return;
    if (selectionCheckRunning) { pendingPreviewOpen = true; return; }
    previewOpening = true;
    selectionRevision++;
    if (selectionTimer !== null) clearTimeout(selectionTimer);
    selectionTimer = null;
    setFloatingButton(false);
    window.Asc.scope.previewImageDirection = 0;
    plugin.callCommand(navigateImageCommand, false, false, function (navigation) {
      openPreview(navigation || {});
    });
  }

  function openPreview(navigation) {
    // 在菜单点击时读取图片，避免弹窗打开后编辑器焦点变化影响选中内容。
    plugin.executeMethod('GetImageDataFromSelection', [], function (data) {
      closePreview();
      var current = new window.Asc.PluginWindow();
      previewWindow = current;
      previewOpening = false;
      current.maximized = false;
      current.restoreSize = [900, 650];
      current.attachEvent('onPreviewReady', function () {
        // 传入不同的尺寸上下限，编辑器才会启用窗口边框拖拽；0 表示不额外限制最大尺寸。
        plugin.executeMethod('ResizeWindow', [current.id, [900, 650], [480, 320], [0, 0]]);
        plugin.executeMethod('AddWindowHeaderItem', [{guid: plugin.guid, frames: [{
          id: current.id,
          items: [maximizeButton(current)]
        }]}]);
        current.command('onPreviewData', {
          src: data && data.src,
          error: data && data.src ? '' : '未能读取图片，请关闭窗口后重新右键图片。',
          canPrev: !!navigation.canPrev, canNext: !!navigation.canNext
        });
      });
      current.attachEvent('onPreviewSizeAction', function (request) { resizePreview(current, request); });
      current.attachEvent('onPreviewNavigate', function (request) { navigatePreview(current, request); });
      current.attachEvent('onPreviewClose', closePreview);
      current.show({
        url: window.location.href.split('?')[0].replace(/[^/]*$/, 'viewer.html'),
        description: '图片放大预览',
        type: 'window', isVisual: true, isModal: true, isInsideMode: false,
        EditorsSupport: ['word'], size: [900, 650],
        buttons: [{text: '关闭', primary: false}]
      });
    });
  }

  plugin.init = function () {
    plugin.attachContextMenuClickEvent('previewImage', showPreview);
    plugin.attachWindowHeaderMenuClickEvent('previewMaximize', function () {
      if (previewWindow) previewWindow.command('onPreviewSizeRequest', {action: 'toggleMaximize'});
    });
    // 注册编辑器事件；只绑定菜单项回调不会让编辑器发送点击通知。
    if (plugin.attachEditorEvent) {
      plugin.attachEditorEvent('onContextMenuClick', function (id) {
        plugin._onCustomMenuClick('contextMenuEvents', id);
      });
      plugin.attachEditorEvent('onWindowHeaderMenuClick', plugin.event_onWindowHeaderMenuClick);
      plugin.attachEditorEvent('onFloatActionButtonClick', plugin.event_onFloatActionButtonClick);
      plugin.attachEditorEvent('onClick', refreshFloatingButton);
      plugin.attachEditorEvent('onTargetPositionChanged', refreshFloatingButton);
      plugin.attachEditorEvent('onDocumentContentReady', refreshFloatingButton);
    }
    refreshFloatingButton();
  };

  plugin.event_onClick = refreshFloatingButton;
  plugin.event_onTargetPositionChanged = refreshFloatingButton;
  plugin.event_onDocumentContentReady = refreshFloatingButton;
  // 当前官方 SDK 有浮动按钮的绑定辅助方法，但缺少默认点击分发函数，需显式处理编辑器事件。
  plugin.event_onFloatActionButtonClick = function (id) {
    if (id === 'previewFloating') showPreview();
  };

  // 使用静态事件声明兼容 7.4 起的客户端；每次菜单事件都必须回传结果。
  plugin.event_onContextMenuShow = function (options) {
    var type = options && (options.type || options.Type);
    plugin.executeMethod('AddContextMenuItem', [{
      guid: plugin.guid,
      items: type === 'Image' ? [{id: 'previewImage', text: '查看大图'}] : []
    }]);
  };

  plugin.button = function (id, windowId) {
    if (windowId) {
      plugin.executeMethod('CloseWindow', [windowId]);
      if (previewWindow && previewWindow.id === windowId) previewWindow = null;
      refreshFloatingButton();
    }
  };
}());
