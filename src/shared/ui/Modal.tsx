import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    node?.showModal();
    return () => { node?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby={heading} onCancel={e => { e.preventDefault(); onClose(); }} className="modal">
    <div className="panel-heading"><h2 id={heading}>{title}</h2><button onClick={onClose} aria-label="Cerrar diálogo">×</button></div>{children}
  </dialog>;
}
