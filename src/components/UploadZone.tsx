import { useCallback, useRef, useState } from 'react';
import { UploadCloud, X, FileText, FileImage, FileVideo, FileAudio, File, CheckCircle2 } from 'lucide-react';

export type UploadedFile = {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'done';
};

const iconFor = (type: string) => {
  if (type.startsWith('image/')) return FileImage;
  if (type.startsWith('video/')) return FileVideo;
  if (type.startsWith('audio/')) return FileAudio;
  if (type === 'application/pdf') return FileText;
  return File;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type Updater = UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[]);

type Props = {
  files: UploadedFile[];
  onFiles: (files: Updater) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  subtitle?: string;
  compact?: boolean;
};

export function UploadZone({ files, onFiles, accept = '*', multiple = true, title, subtitle, compact }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const list = Array.from(newFiles);
    const uploaded: UploadedFile[] = list.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      progress: 0,
      status: 'uploading',
    }));
    onFiles([...files, ...uploaded]);
    uploaded.forEach((uf) => {
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 28 + 12;
        if (p >= 100) {
          p = 100;
          clearInterval(interval);
          onFiles((prev) => prev.map((f) => (f.id === uf.id ? { ...f, progress: 100, status: 'done' } : f)));
        } else {
          onFiles((prev) => prev.map((f) => (f.id === uf.id ? { ...f, progress: p } : f)));
        }
      }, 180);
    });
  }, [files, onFiles]);

  const removeFile = (id: string) => onFiles(files.filter((f) => f.id !== id));

  return (
    <div className={compact ? '' : 'space-y-4'}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ${dragging ? 'border-brand-500 bg-brand-50/60 scale-[1.01]' : 'border-ink-200 bg-white hover:border-brand-400 hover:bg-brand-50/30'} ${compact ? 'p-6' : 'p-10 sm:p-14'}`}
      >
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 dotted-bg" />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <div className="relative flex flex-col items-center text-center">
          <div className={`grid place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-glow transition-transform ${dragging ? 'scale-110' : 'group-hover:scale-105'} ${compact ? 'h-12 w-12' : 'h-16 w-16'}`}>
            <UploadCloud className={compact ? 'h-5 w-5' : 'h-7 w-7'} strokeWidth={2.2} />
          </div>
          <p className={`mt-4 font-display font-bold text-ink-900 ${compact ? 'text-base' : 'text-lg'}`}>
            {title ?? 'Drag & drop files here'}
          </p>
          <p className={`mt-1 text-ink-500 ${compact ? 'text-xs' : 'text-sm'}`}>
            {subtitle ?? 'or click to browse from your device'}
          </p>
          {!compact && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {['PDF', 'Word', 'Excel', 'PPT', 'Images', 'CSV', 'TXT', 'ZIP', 'Videos', 'Audio'].map((f) => (
                <span key={f} className="chip">{f}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2.5">
          {files.map((f) => {
            const Icon = iconFor(f.file.type);
            return (
              <div key={f.id} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-ink-200 animate-fade-up">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink-900">{f.file.name}</p>
                    <span className="shrink-0 text-xs text-ink-400">{formatSize(f.file.size)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${f.status === 'done' ? 'bg-accent-500' : 'bg-brand-500'}`}
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                </div>
                {f.status === 'done' ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-accent-500" />
                ) : (
                  <button onClick={() => removeFile(f.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
