import type { CameraStatus } from '../camera/CameraPanel';

export type StepStatus = 'waiting' | 'in-progress' | 'complete' | 'attention';
export interface StepView {
  readonly status: StepStatus;
  readonly label: string;
  readonly detail: string;
}

/** Describe únicamente el estado de cámara, nunca infiere que YOLO está funcionando. */
export function cameraStep(status: CameraStatus): StepView {
  switch (status) {
    case 'idle':
      return { status: 'waiting', label: 'Iniciar cámara', detail: 'Elige el dispositivo y pulsa Iniciar cámara.' };
    case 'requesting':
      return { status: 'in-progress', label: 'Permiso solicitado', detail: 'Autoriza el uso de la cámara o cancela la solicitud.' };
    case 'preview':
      return { status: 'complete', label: 'Cámara en vivo', detail: 'Vista previa local activa; aún no hay análisis YOLO.' };
    case 'paused':
      return { status: 'in-progress', label: 'Cámara pausada', detail: 'Reanuda o detén la vista previa cuando lo necesites.' };
    case 'failed':
      return { status: 'attention', label: 'Revisar cámara', detail: 'Consulta el error del visor y vuelve a intentarlo.' };
  }
}
