import {describe,it,expect} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const exists=(name:string)=>existsSync(new URL(name,root));
describe('Estructura modular 5.2 comprobable',()=>{
 const manifest=JSON.parse(readFileSync(new URL('scripts/architecture-layout.json',root),'utf8')) as {
  readonly version:number;readonly moves:Record<string,string>;
 };
 it('conserva un mapa explícito de cada movimiento',()=>{
  expect(manifest.version).toBe(1);
  expect(Object.keys(manifest.moves).length).toBeGreaterThanOrEqual(100);
  for(const [oldPath,newPath] of Object.entries(manifest.moves)){
   expect(exists(oldPath),oldPath+' debe retirarse').toBe(false);
   expect(exists(newPath),newPath+' debe existir').toBe(true);
  }
 });
 it('separa rutas, presentación, contratos, casos de uso y persistencia',()=>{
  for(const name of [
   'src/app/router/navigation.ts','src/app/providers/AppProviders.tsx',
   'src/app/layout/Sidebar.tsx','src/app/layout/AppHeader.tsx',
   'src/modules/analysis/hooks/useLiveCameraSelection.ts',
   'src/modules/detections/services/yolo-browser.ts',
   'src/modules/segmentation/services/chromatic-segmentation.ts',
   'src/modules/patterns/services/operational-rule-engine.ts',
   'src/core/contracts/live-observation-contract.ts',
   'src/infrastructure/persistence/LocalAnalysisRepository.ts',
   'src/shared/hooks/useLiveObservationRepository.ts',
   'server/api/app.py'
  ])expect(exists(name),name).toBe(true);
 });
 it('ejecuta QA desde tests/e2e y evita rutas antiguas',()=>{
  const ci=readFileSync(new URL('.github/workflows/verify.yml',root),'utf8');
  expect(ci).toContain('node tests/e2e/qa-responsive.mjs');
  expect(ci).not.toContain('node scripts/qa-responsive.mjs');
 });
});
