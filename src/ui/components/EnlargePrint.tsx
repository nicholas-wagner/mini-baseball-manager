import { useRef, useState, type ReactNode } from 'react';
import { Expand, X } from 'lucide-react';

export function EnlargePrint({
  name,
  src,
  children,
}: {
  name: string;
  src: string;
  children?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={'Enlarge ' + name + ' illustration'}
        className={
          children
            ? 'gallery-tile'
            : 'absolute bottom-1 right-1 flex size-11 items-center justify-center rounded-full bg-[#142729]/80 text-white cursor-zoom-in'
        }
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
      >
        {children ?? <Expand size={18} aria-hidden="true" />}
      </button>
      <dialog
        ref={dialog}
        aria-label={name + ' illustration'}
        onClose={() => setOpen(false)}
        className="fixed m-auto max-h-[96dvh] max-w-[96vw] rounded-xl border-2 border-[#eedbb0] bg-[#13292b] text-[#fff7e6] shadow-xl backdrop:bg-[#0a1920]/90"
      >
        {open && (
          <>
            <img
              alt={name + ' full illustration'}
              src={src}
              className="block max-h-[calc(95dvh-52px)] max-w-full object-contain mx-auto"
            />
            <div className="flex items-center justify-between gap-3 pl-3">
              <strong>{name}</strong>
              <button
                type="button"
                aria-label="Close illustration"
                className="grid size-11 place-content-center cursor-pointer"
                onClick={() => dialog.current?.close()}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
