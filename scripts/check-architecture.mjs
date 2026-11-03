import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root = path.resolve('src');
const failures = [];
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : /\.tsx?$/.test(entry.name) ? [absolute] : [];
  });
}
for (const file of walk(root)) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function inspect(node) {
    let literal;
    if (relative.startsWith('core/') && ts.isIdentifier(node) && ['window', 'document', 'localStorage', 'indexedDB', 'fetch'].includes(node.text)) failures.push(`${relative}: acceso de plataforma dentro del núcleo ${node.text}`);
    if (relative.startsWith('core/') && ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') failures.push(`${relative}: require no permitido dentro del núcleo`);
    if (relative.startsWith('core/') && ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && !ts.isStringLiteral(node.arguments[0])) failures.push(`${relative}: import dinámico no literal dentro del núcleo`);
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) literal = node.moduleSpecifier;
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) literal = node.arguments[0];
    if (literal && ts.isStringLiteral(literal)) {
      const specifier = literal.text;
      const resolved = specifier.startsWith('.') ? path.relative(root, path.resolve(path.dirname(file), specifier)).replaceAll('\\', '/') : specifier;
      if (relative.startsWith('core/')) {
        const allowed = relative.startsWith('core/domain/') ? ['core/domain/'] : ['core/domain/', 'core/ports/', 'core/application/'];
        if (!specifier.startsWith('.') || !allowed.some(prefix => resolved.startsWith(prefix))) failures.push(`${relative}: dependencia prohibida ${specifier}`);
      }
      const isView = relative.startsWith('modules/') || (relative.startsWith('app/') && relative !== 'app/bootstrap.ts');
      if (isView && resolved.startsWith('infrastructure/')) failures.push(`${relative}: vista acoplada a ${specifier}`);
      if (relative.startsWith('infrastructure/') && (resolved.startsWith('app/') || resolved.startsWith('modules/'))) failures.push(`${relative}: infraestructura depende de UI`);
    }
    ts.forEachChild(node, inspect);
  }
  inspect(source);
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('Arquitectura: contratos y núcleo independientes; composición de adaptadores centralizada.');
