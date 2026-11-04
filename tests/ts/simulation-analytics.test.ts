import { describe,expect,it } from 'vitest';
import { activityIndex } from '../../src/modules/live/SimulationAnalytics';
import { simulationSnapshot } from '../../src/modules/live/simulation-engine';

describe('Indicadores del gemelo digital',()=>{
  it('calcula actividad sintética acotada y con variación',()=>{
    for(const scenario of ['safety','quality','retail','warehouse'] as const){
      const observations=Array.from({length:100},(_,i)=>activityIndex(simulationSnapshot(scenario,i*.8)));
      expect(observations.every(v=>Number.isFinite(v)&&v>=0&&v<=100)).toBe(true);
      expect(new Set(observations).size).toBeGreaterThan(1);
    }
  });
  it('no confunde el índice de actividad con confianza YOLO',()=>{
    const score=activityIndex(simulationSnapshot('warehouse',15));
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeLessThanOrEqual(100);
  });
});
