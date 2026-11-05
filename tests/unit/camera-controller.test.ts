import { describe, it, expect, vi } from 'vitest';
import { CameraController } from '../../src/modules/analysis/services/camera-controller';
function fake() { const track = { enabled: true, stop: vi.fn() }; return { track, stream: { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream }; }
describe('Propiedad y cancelación de cámara', () => {
 it('libera un permiso concedido después de detener', async () => {
  const f = fake(); let resolve!: (s: MediaStream) => void;
  const c = new CameraController(() => new Promise(r => { resolve = r; }));
  const pending = c.start(''); c.stop(); resolve(f.stream);
  expect(await pending).toBeNull(); expect(f.track.stop).toHaveBeenCalledOnce();
 });
 it('pausa, reanuda y libera las pistas', async () => {
  const f = fake(); const request = vi.fn(async () => f.stream); const c = new CameraController(request);
  await c.start('cam-2'); expect(request).toHaveBeenCalledWith({ audio:false,video:{deviceId:{exact:'cam-2'}} });
  c.pause(true); expect(f.track.enabled).toBe(false); c.pause(false); expect(f.track.enabled).toBe(true);
  c.stop(); c.stop(); expect(f.track.stop).toHaveBeenCalledOnce();
 });
 it('una solicitud posterior invalida la anterior sin cerrar su nueva cámara', async () => {
  const old = fake(), fresh = fake(); let resolve!: (s: MediaStream) => void;
  const request = vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValueOnce(fresh.stream);
  const c = new CameraController(request); const first = c.start(''); await c.start('next'); resolve(old.stream);
  expect(await first).toBeNull(); expect(old.track.stop).toHaveBeenCalledOnce(); expect(fresh.track.stop).not.toHaveBeenCalled(); c.stop();
 });
 it('propaga un rechazo de permiso y permite reintentar', async () => {
  const f = fake(); const request = vi.fn().mockRejectedValueOnce(new Error('Permiso rechazado')).mockResolvedValueOnce(f.stream);
  const c = new CameraController(request); await expect(c.start('')).rejects.toThrow('Permiso rechazado'); expect(await c.start('')).toBe(f.stream); c.stop();
 });
});
