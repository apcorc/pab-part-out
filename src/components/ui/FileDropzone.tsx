import { useCallback, useId, useRef, useState, type DragEvent } from 'react'
import { Upload } from 'lucide-react'

interface FileDropzoneProps {
  label: string
  hint: string
  accept: string
  multiple?: boolean
  disabled?: boolean
  onFiles: (files: File[]) => void
}

export function FileDropzone({
  label,
  hint,
  accept,
  multiple = false,
  disabled = false,
  onFiles,
}: FileDropzoneProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return
      const files = Array.from(list)
      onFiles(multiple ? files : [files[0]])
      if (inputRef.current) inputRef.current.value = ''
    },
    [multiple, onFiles],
  )

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-labelledby={`${inputId}-label`}
      className={`dropzone ${dragging ? 'dropzone-active' : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragging(false)
      }}
      onDrop={onDrop}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onClick={() => {
        if (!disabled) inputRef.current?.click()
      }}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Upload className="h-5 w-5 text-[var(--accent)]" aria-hidden />
      <div>
        <p id={`${inputId}-label`} className="text-sm font-medium">
          {label}
        </p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>
      </div>
    </div>
  )
}
