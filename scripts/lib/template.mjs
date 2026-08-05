/**
 * Minimal, dependency-free templating engine.
 *
 * Supported syntax:
 *   {{a.b.c}}          → HTML-escaped value
 *   {{{a.b.c}}}        → raw / unescaped value
 *   {{#if a.b}}…{{else}}…{{/if}}
 *   {{#each a.b}}…{{/each}}   (inside: {{this}}, {{this.field}}, {{@index}}, {{@first}}, {{@last}})
 *
 * Nesting is supported via a small stack-based parser (not naive regex),
 * so an {{#each}} can contain its own {{#if}} / nested {{#each}}.
 */

const TOKEN_RE = /\{\{\{([^}]+?)\}\}\}|\{\{(#each|#if|else|\/each|\/if)?\s*([^}]*?)\}\}/g;

function tokenize(src) {
  const tokens = [];
  let lastIndex = 0;
  let match;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(src))) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: src.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      tokens.push({ type: 'raw', expr: match[1].trim() });
    } else {
      const kw = match[2];
      const expr = (match[3] || '').trim();
      if (kw === '#each') tokens.push({ type: 'each-open', expr });
      else if (kw === '#if') tokens.push({ type: 'if-open', expr });
      else if (kw === 'else') tokens.push({ type: 'else' });
      else if (kw === '/each') tokens.push({ type: 'each-close' });
      else if (kw === '/if') tokens.push({ type: 'if-close' });
      else tokens.push({ type: 'escaped', expr });
    }
    lastIndex = TOKEN_RE.lastIndex;
  }
  if (lastIndex < src.length) tokens.push({ type: 'text', value: src.slice(lastIndex) });
  return tokens;
}

// Build a tree from the flat token stream so blocks can nest.
function buildTree(tokens) {
  const root = { type: 'root', children: [] };
  const stack = [root];

  for (const tok of tokens) {
    const top = stack[stack.length - 1];
    if (tok.type === 'each-open') {
      const node = { type: 'each', expr: tok.expr, children: [] };
      top.children.push(node);
      stack.push(node);
    } else if (tok.type === 'if-open') {
      const node = { type: 'if', expr: tok.expr, children: [], elseChildren: null, _inElse: false };
      top.children.push(node);
      stack.push(node);
    } else if (tok.type === 'else') {
      if (top.type === 'if') {
        top.elseChildren = [];
        top._inElse = true;
      }
    } else if (tok.type === 'each-close' || tok.type === 'if-close') {
      stack.pop();
    } else {
      const target = top.type === 'if' && top._inElse ? top.elseChildren : top.children;
      target.push(tok);
    }
  }
  return root;
}

function resolve(path, ctxStack) {
  if (path === 'this' || path === '.') return ctxStack[ctxStack.length - 1];
  if (path.startsWith('@')) {
    const frame = ctxStack.__meta && ctxStack.__meta[ctxStack.__meta.length - 1];
    if (!frame) return undefined;
    if (path === '@index') return frame.index;
    if (path === '@first') return frame.index === 0;
    if (path === '@last') return frame.index === frame.length - 1;
    return undefined;
  }

  // Parent-scope access, Handlebars-style: "../foo", "../../foo.bar" walks
  // up the context stack one frame per "../" before resolving the rest.
  let frameIndex = ctxStack.length - 1;
  let rest = path;
  while (rest.startsWith('../')) {
    frameIndex -= 1;
    rest = rest.slice(3);
  }
  if (frameIndex < 0) return undefined;

  const parts = rest.replace(/^this\./, '').split('.');
  let cur = ctxStack[frameIndex];
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isTruthy(v) {
  if (Array.isArray(v)) return v.length > 0;
  return !!v;
}

function renderNodes(nodes, ctxStack) {
  let out = '';
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        out += node.value;
        break;
      case 'escaped': {
        const v = resolve(node.expr, ctxStack);
        out += v == null ? '' : escapeHtml(v);
        break;
      }
      case 'raw': {
        const v = resolve(node.expr, ctxStack);
        out += v == null ? '' : String(v);
        break;
      }
      case 'if': {
        const v = resolve(node.expr, ctxStack);
        if (isTruthy(v)) out += renderNodes(node.children, ctxStack);
        else if (node.elseChildren) out += renderNodes(node.elseChildren, ctxStack);
        break;
      }
      case 'each': {
        const arr = resolve(node.expr, ctxStack) || [];
        if (!ctxStack.__meta) ctxStack.__meta = [];
        arr.forEach((item, index) => {
          ctxStack.push(item);
          ctxStack.__meta.push({ index, length: arr.length });
          out += renderNodes(node.children, ctxStack);
          ctxStack.__meta.pop();
          ctxStack.pop();
        });
        break;
      }
      default:
        break;
    }
  }
  return out;
}

export function render(src, data) {
  const tree = buildTree(tokenize(src));
  const ctxStack = [data];
  ctxStack.__meta = [];
  return renderNodes(tree.children, ctxStack);
}
