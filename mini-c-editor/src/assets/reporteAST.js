export function generarReporteAST(ast) {
    const html = `
      <html>
        <head>
          <title>Reporte AST</title>
          <style>
            body { font-family: monospace; padding: 20px; background: #f0f0f0; }
            .node { margin-left: 20px; }
          </style>
        </head>
        <body>
          ${renderNode(ast)}
        </body>
      </html>
    `;
    return html;
  }
  
  function renderNode(node, indent = 0) {
    if (typeof node !== 'object' || node === null) {
      return `<div class="node">${'&nbsp;'.repeat(indent * 2)}${node}</div>`;
    }
  
    let html = `<div class="node">${'&nbsp;'.repeat(indent * 2)}${node.type || 'Objeto'}</div>`;
    for (const key in node) {
      if (key === 'type') continue;
      const child = node[key];
      html += `<div class="node">${'&nbsp;'.repeat((indent + 1) * 2)}${key}:</div>`;
      if (Array.isArray(child)) {
        child.forEach((item, index) => {
          html += renderNode(item, indent + 2);
        });
      } else {
        html += renderNode(child, indent + 2);
      }
    }
    return html;
  }