import {describe,it,expect} from 'vitest';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const files=[
 'src/app/App.tsx',
 'src/modules/experience/StudioLanding.tsx',
 'src/modules/experience/StudioCommandPalette.tsx',
 'src/modules/experience/ImmersiveHero.tsx',
 'src/modules/analysis/pages/LiveAnalysisPage.tsx',
 'src/modules/analysis/pages/LiveTrafficAnalysis.tsx',
 'src/modules/scenarios/pages/InteractiveSimulator.tsx',
 'src/modules/detections/components/YoloBrowserPanel.tsx',
 'src/modules/alerts/components/YoloMonitor.tsx',
 'src/modules/scenarios/components/SimulationAnalytics.tsx',
 'src/modules/analysis/components/SimulationVideoPanel.tsx',
 'src/modules/analysis/components/LiveInferencePanel.tsx',
 'src/modules/analysis/components/PublicCameraLab.tsx',
 'src/modules/analysis/components/ResultFrameViewer.tsx',
 'src/modules/analysis/components/CameraPanel.tsx',
 'src/modules/dashboard/pages/SessionsDashboard.tsx',
 'src/modules/alerts/pages/OperationsPanel.tsx',
 'src/modules/history/pages/HistoryPanel.tsx',
 'src/modules/settings/pages/PrivacyCenter.tsx'
] as const;
const code=(path:string)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
// Los nombres de módulos, clases CSS e identificadores técnicos NO son textos de interfaz.
const forbidden=/(?:YOLO|ONNX|WASM|HLS|IndexedDB|WebGL|COCO|CORS|\bAPI\b|\bbackend\b)/;
const visibleAttribute=new Set(['aria-label','title','placeholder','alt','label']);
function publicLiterals(path:string):string[]{
 const source=ts.createSourceFile(path,code(path),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const found:string[]=[];
 function walk(node:ts.Node){
  if(ts.isJsxText(node)&&node.getText(source).trim())found.push(node.getText(source));
  if(ts.isJsxAttribute(node)&&visibleAttribute.has(node.name.getText(source))&&
   node.initializer&&ts.isStringLiteral(node.initializer))found.push(node.initializer.text);
  if(ts.isStringLiteral(node)&&!ts.isImportDeclaration(node.parent)&&
   !ts.isExportDeclaration(node.parent)&&
   !ts.isJsxAttribute(node.parent))found.push(node.text);
  if(ts.isNoSubstitutionTemplateLiteral(node))found.push(node.text);
  ts.forEachChild(node,walk);
 }
 walk(source);
 return found;
}
describe('Interfaz clara sin terminología de implementación',()=>{
 it.each(files)('%s no expone nombres del motor ni de la infraestructura',path=>{
  const leaking=publicLiterals(path).filter(text=>forbidden.test(text));
  expect(leaking).toEqual([]);
 });
 it('mantiene funciones accesibles con nombres orientados al usuario',()=>{
  const live=code('src/modules/analysis/pages/LiveTrafficAnalysis.tsx');
  const scene=code('src/modules/scenarios/pages/InteractiveSimulator.tsx');
  const history=code('src/modules/history/pages/HistoryPanel.tsx');
  expect(live).toContain('Iniciar reconocimiento');
  expect(live).toContain('Guardar análisis');
  expect(live).toContain('Otra cámara');
  expect(scene).toContain('Reconocer objetos');
  expect(history).toContain('Reconocimiento de objetos');
 });
});
