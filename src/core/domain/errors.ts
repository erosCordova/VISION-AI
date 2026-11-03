export type DomainErrorCode = 'INVALID_INPUT' | 'INVALID_RESULT' | 'INVALID_STATE'
  | 'INVALID_TRANSITION' | 'VERSION_CONFLICT' | 'STALE_EXECUTION' | 'RESULT_NOT_COMMITTED'
  | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'SNAPSHOT_INCOMPATIBLE' | 'ENGINE_UNAVAILABLE'
  | 'OPERATION_ABORTED' | 'INVALID_CONFIGURATION';
const messages: Record<DomainErrorCode, string> = {
  INVALID_INPUT: 'La entrada del análisis no es válida.',
  INVALID_RESULT: 'El resultado no coincide con el contrato del análisis.',
  INVALID_STATE: 'El estado del análisis no es válido.',
  INVALID_TRANSITION: 'La acción no está permitida desde el estado actual.',
  VERSION_CONFLICT: 'El registro cambió. Recarga antes de continuar.',
  STALE_EXECUTION: 'La respuesta corresponde a otra ejecución o está fuera de orden.',
  RESULT_NOT_COMMITTED: 'No hay un resultado validado y guardado.',
  NOT_FOUND: 'No se encontró el análisis.', ALREADY_EXISTS: 'El análisis ya existe.',
  SNAPSHOT_INCOMPATIBLE: 'La copia no es compatible. Se conservan los datos actuales.',
  ENGINE_UNAVAILABLE: 'El motor de visión todavía no está conectado.',
  OPERATION_ABORTED: 'La operación se canceló.',
  INVALID_CONFIGURATION: 'La configuración de la aplicación no es válida.',
};
export class DomainError extends Error {
  constructor(readonly code: DomainErrorCode) { super(messages[code]); this.name = 'DomainError'; }
}
