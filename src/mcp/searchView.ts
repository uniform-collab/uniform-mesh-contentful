/**
 * The MCP App view for `search_content`.
 *
 * Served verbatim as the body of `ui://uniform-contentful/search`. It runs in a
 * sandboxed iframe with `allow-scripts` but no `allow-same-origin`, so: no
 * storage, no cookies, no host style tokens, and no external CSS or JS. Keep it
 * a single self-contained document.
 */
export const SEARCH_VIEW_HTML = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contentful search</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #ffffff;
    --fg: #1b1f24;
    --muted: #5c6670;
    --line: #e3e7eb;
    --card: #f7f8fa;
    --accent: #2e75d4;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #16191d;
      --fg: #e9edf1;
      --muted: #9aa5b1;
      --line: #2b3137;
      --card: #1e2227;
      --accent: #6ba4f0;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .wrap { padding: 12px; }
  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--line);
  }
  .head h1 { margin: 0; font-size: 13px; font-weight: 600; }
  .head .count { color: var(--muted); font-size: 12px; white-space: nowrap; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
  }
  .card {
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--card);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .thumb {
    aspect-ratio: 4 / 3;
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .thumb .ph { color: var(--muted); font-size: 11px; letter-spacing: .04em; text-transform: uppercase; }
  .meta { padding: 8px; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .title {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .sub, .id { color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .state { color: var(--muted); padding: 20px 12px; text-align: center; }
  .tag {
    display: inline-block;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .04em;
    color: var(--accent);
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="head">
    <h1 id="heading">Contentful</h1>
    <span class="count" id="count"></span>
  </div>
  <div id="body"><div class="state">Waiting for results&hellip;</div></div>
</div>
<script>
(function () {
  var MAX_HEIGHT = 720;
  var nextId = 1;
  var pending = {};

  function post(message) {
    window.parent.postMessage(message, '*');
  }

  function request(method, params) {
    return new Promise(function (resolve, reject) {
      var id = nextId++;
      pending[id] = { resolve: resolve, reject: reject };
      post({ jsonrpc: '2.0', id: id, method: method, params: params || {} });
    });
  }

  function notify(method, params) {
    post({ jsonrpc: '2.0', method: method, params: params || {} });
  }

  var lastHeight = 0;
  function reportSize() {
    // Measure the content wrapper, not the document: the host sizes the iframe
    // from whatever we last reported, which stretches the document to match, so
    // measuring the document would let the view grow but never shrink.
    var wrap = document.querySelector('.wrap');
    var content = wrap ? Math.ceil(wrap.getBoundingClientRect().height) : document.documentElement.scrollHeight;
    var height = Math.min(content, MAX_HEIGHT);
    if (height === lastHeight) return;
    lastHeight = height;
    notify('ui/notifications/size-changed', { height: height });
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function thumbUrl(url) {
    if (!url) return '';
    var absolute = url.indexOf('//') === 0 ? 'https:' + url : url;
    if (absolute.indexOf('images.ctfassets.net') === -1) return absolute;
    return absolute + (absolute.indexOf('?') === -1 ? '?' : '&') + 'w=320&h=240&fit=fill&fm=webp&q=70';
  }

  function render(payload) {
    var items = (payload && payload.items) || [];
    var heading = document.getElementById('heading');
    var count = document.getElementById('count');
    var body = document.getElementById('body');

    heading.textContent = payload && payload.query ? 'Results for "' + payload.query + '"' : 'Contentful';
    var total = payload && typeof payload.total === 'number' ? payload.total : items.length;
    count.textContent = items.length === total
      ? total + (total === 1 ? ' item' : ' items')
      : 'showing ' + items.length + ' of ' + total;

    if (!items.length) {
      body.innerHTML = '<div class="state">No matching content.</div>';
      reportSize();
      return;
    }

    var html = '<div class="grid">';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var src = thumbUrl(item.thumbnailUrl);
      html += '<div class="card">';
      html += '<div class="thumb">';
      html += src
        ? '<img loading="lazy" alt="" src="' + esc(src) + '">'
        : '<span class="ph">' + esc(item.kind === 'asset' ? 'asset' : 'entry') + '</span>';
      html += '</div><div class="meta">';
      if (item.contentType) html += '<span class="tag">' + esc(item.contentType) + '</span>';
      html += '<span class="title">' + esc(item.title || item.id) + '</span>';
      if (item.subtitle) html += '<span class="sub">' + esc(item.subtitle) + '</span>';
      html += '<span class="id">' + esc(item.id) + '</span>';
      html += '</div></div>';
    }
    html += '</div>';
    body.innerHTML = html;
    reportSize();
  }

  function fail(message) {
    document.getElementById('body').innerHTML = '<div class="state">' + esc(message) + '</div>';
    reportSize();
  }

  /**
   * Scout joins MCP text content into a single string before it reaches the
   * view, so 'structuredContent' is not reliable here - the tool emits its JSON
   * as text content and the view parses it back.
   */
  function extractPayload(result) {
    if (!result) return null;
    if (result.structuredContent && result.structuredContent.items) return result.structuredContent;

    var content = result.content;
    var text = '';
    if (typeof content === 'string') {
      text = content;
    } else if (Array.isArray(content)) {
      for (var i = 0; i < content.length; i++) {
        var part = content[i];
        if (typeof part === 'string') text += part;
        else if (part && part.type === 'text' && typeof part.text === 'string') text += part.text;
      }
    }
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }

  window.addEventListener('message', function (event) {
    var message = event.data;
    if (!message || message.jsonrpc !== '2.0') return;

    if (message.id !== undefined && pending[message.id]) {
      var entry = pending[message.id];
      delete pending[message.id];
      if (message.error) entry.reject(message.error);
      else entry.resolve(message.result);
      return;
    }

    if (message.method === 'ui/notifications/tool-result') {
      var params = message.params || {};
      var payload = extractPayload(params.result || params);
      if (payload) render(payload);
      else fail('Results arrived in an unexpected shape.');
    }
  });

  if (window.ResizeObserver) {
    new ResizeObserver(reportSize).observe(document.querySelector('.wrap') || document.body);
  }

  // Nothing is sent to the view until it has announced a handler, so initialize
  // first and only then start listening for input and results.
  request('ui/initialize', { capabilities: {} })
    .then(function () {
      notify('ui/notifications/initialized');
      reportSize();
    })
    .catch(function () {
      fail('Could not initialize the view.');
    });
})();
</script>
</body>
</html>`;
