/** Controla la propiedad de la cámara y descarta permisos resueltos tras cancelar. */
export class CameraController {
  private generation = 0;
  private stream: MediaStream | null = null;
  constructor(private readonly request: (constraints: MediaStreamConstraints) => Promise<MediaStream>) {}
  async start(deviceId: string): Promise<MediaStream | null> {
    this.stop();
    const generation = this.generation;
    const stream = await this.request({ audio: false, video: deviceId ? { deviceId: { exact: deviceId } } : true });
    if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return null; }
    this.stream = stream;
    return stream;
  }
  pause(paused: boolean) { this.stream?.getVideoTracks().forEach(track => { track.enabled = !paused; }); }
  stop() { this.generation++; this.stream?.getTracks().forEach(track => track.stop()); this.stream = null; }
}
