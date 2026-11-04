import {describe,it,expect} from 'vitest';
import {expiredSessionIds,isRetentionDays,formatLocalDataSummary,
 PRIVACY_CONFIRM_ERASE,PRIVACY_CONFIRM_PURGE} from '../../src/core/domain/local-data-policy';
const now=new Date('2026-11-04T18:00:00Z');
describe('Fase 13 — retención manual y datos privados locales',()=>{
 it.each([30,90,180] as const)('admite retención %i días',days=>{
  expect(isRetentionDays(days)).toBe(true);
  expect(expiredSessionIds([{id:'older',savedAt:'2024-05-01T00:00:00Z'}],days,now))
   .toEqual(['older']);
 });
 it('no admite cifras arbitrarias, NaN ni periodos negativos',()=>{
  for(const value of [0,-30,31,365,'30',Number.NaN])
   expect(isRetentionDays(value)).toBe(false);
  expect(()=>expiredSessionIds([],-1 as 30,now)).toThrow();
  expect(()=>expiredSessionIds([],30,new Date(NaN))).toThrow();
 });
 it('corte temporal exacto; lo reciente permanece',()=>{
  const boundary=new Date(now.getTime()-30*86_400_000).toISOString();
  const oneLater=new Date(Date.parse(boundary)+1000).toISOString();
  const ids=expiredSessionIds([
   {id:'expired',savedAt:boundary},{id:'recent',savedAt:oneLater},
   {id:'future',savedAt:'2027-01-01T00:00:00Z'}
  ],30,now);
  expect(ids).toEqual(['expired']);
 });
 it('aísla las fechas corruptas: no las borra por una retención de tiempo',()=>{
  const ids=expiredSessionIds([{id:'damaged',savedAt:'fecha-invalidada'},
   {id:'older',savedAt:'2020-03-03T00:00:00Z'}],90,now);
  expect(ids).toEqual(['older']);
 });
 it('no muta registros al calcular expiración',()=>{
  const records=[{id:'b',savedAt:'2020-01-01T00:00:00Z'},
   {id:'a',savedAt:'2021-01-01T00:00:00Z'}];
  const before=JSON.stringify(records);
  expect(expiredSessionIds(records,30,now)).toEqual(['a','b']);
  expect(JSON.stringify(records)).toBe(before);
 });
 it('rechaza contadores negativos o fraccionales de privacidad',()=>{
  expect(()=>formatLocalDataSummary(-1,0,0,0)).toThrow();
  expect(()=>formatLocalDataSummary(1.1,0,0,0)).toThrow();
  expect(formatLocalDataSummary(2,1,3,1)).toEqual({
   sessions:2,corrupt:1,reviews:3,expired:1
  });
 });
 it('exige frases distintas para los dos niveles de borrado',()=>{
  expect(PRIVACY_CONFIRM_PURGE).toBe('DEPURAR');
  expect(PRIVACY_CONFIRM_ERASE).toBe('BORRAR TODO');
  expect(PRIVACY_CONFIRM_ERASE).not.toBe(PRIVACY_CONFIRM_PURGE);
 });
});
