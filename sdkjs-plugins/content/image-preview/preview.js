(function () {
  'use strict';
  var view = document.getElementById('view'), img = document.getElementById('photo');
  var msg = document.getElementById('message'), status = document.getElementById('status');
  var previous = document.getElementById('previous'), next = document.getElementById('next');
  var navigation = {canPrev: false, canNext: false}, navigating = false;
  function updateNavigation(data) {
    navigating = false;
    navigation = {canPrev: !!data.canPrev, canNext: !!data.canNext};
    previous.disabled = !navigation.canPrev;
    next.disabled = !navigation.canNext;
  }
  function navigate(direction) {
    if (navigating || (direction < 0 ? !navigation.canPrev : !navigation.canNext)) return;
    navigating = true;
    previous.disabled = next.disabled = true;
    window.Asc.plugin.sendToPlugin('onPreviewNavigate', {direction: direction});
  }
  previous.onclick = function () { navigate(-1); };
  next.onclick = function () { navigate(1); };
  var scale = 1, x = 0, y = 0, dragging = false, lastX = 0, lastY = 0, fitMode = true;
  function draw() { img.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')'; status.textContent = Math.round(scale * 100) + '%'; }
  function center(s) { if (!img.naturalWidth) return; scale = Math.max(0.05, Math.min(12, s)); x = (view.clientWidth - img.naturalWidth * scale) / 2; y = (view.clientHeight - img.naturalHeight * scale) / 2; draw(); }
  function fit() { fitMode = true; if (img.naturalWidth) center(Math.min((view.clientWidth - 24) / img.naturalWidth, (view.clientHeight - 24) / img.naturalHeight)); }
  window.addEventListener('resize', function () { if (fitMode) fit(); });
  document.getElementById('fit').onclick = fit;
  document.getElementById('actual').onclick = function () { fitMode = false; center(1); };
  img.onload = function () { msg.style.display = 'none'; fit(); };
  img.onerror = function () { msg.textContent = '图片无法加载，请重新选中图片后再试。'; };
  view.addEventListener('wheel', function (e) { e.preventDefault(); if (!img.naturalWidth) return; fitMode = false; var box = view.getBoundingClientRect(), px = e.clientX - box.left, py = e.clientY - box.top, next = Math.max(0.05, Math.min(12, scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); x = px - (px - x) * next / scale; y = py - (py - y) * next / scale; scale = next; draw(); }, {passive:false});
  view.addEventListener('pointerdown', function (e) { if (e.target.closest('button') || e.button !== 0 || !img.naturalWidth) return; dragging = true; lastX = e.clientX; lastY = e.clientY; view.setPointerCapture(e.pointerId); view.classList.add('dragging'); });
  view.addEventListener('pointermove', function (e) { if (!dragging) return; x += e.clientX - lastX; y += e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; draw(); });
  function stop() { dragging = false; view.classList.remove('dragging'); }
  view.addEventListener('pointerup', stop); view.addEventListener('pointercancel', stop); view.addEventListener('lostpointercapture', stop);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && window.Asc && Asc.plugin) Asc.plugin.sendToPlugin('onPreviewClose', {}); });
  document.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); navigate(e.key === 'ArrowLeft' ? -1 : 1); } });
  if (!window.Asc || !window.Asc.plugin) { msg.textContent = '插件组件加载失败，请检查是否可以访问 ONLYOFFICE 官方插件 SDK。'; return; }
  window.Asc.plugin.init = function () {
    window.Asc.plugin.attachEvent('onPreviewNavigation', function (data) {
      updateNavigation(data);
      if (data.error) { msg.textContent = data.error; msg.style.display = 'grid'; }
    });
    window.Asc.plugin.attachEvent('onPreviewSizeRequest', function (request) {
      window.Asc.plugin.sendToPlugin('onPreviewSizeAction', {
        action: request.action,
        width: window.innerWidth,
        height: window.innerHeight,
        screenWidth: window.screen.availWidth,
        screenHeight: window.screen.availHeight
      });
    });
    window.Asc.plugin.attachEvent('onPreviewData', function (data) {
      updateNavigation(data || {});
      if (!data || !data.src) { msg.textContent = (data && data.error) || '未能读取图片。'; msg.style.display = 'grid'; return; }
      msg.textContent = '正在加载图片……';
      msg.style.display = 'grid';
      img.src = data.src;
    });
    window.Asc.plugin.sendToPlugin('onPreviewReady', {});
  };
  window.Asc.plugin.button = function () { window.Asc.plugin.sendToPlugin('onPreviewClose', {}); };
}());
