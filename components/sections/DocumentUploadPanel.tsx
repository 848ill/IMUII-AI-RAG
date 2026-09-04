"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  UploadCloud,
  Database,
  RefreshCw,
  Clock,
  FileCheck,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileText,
  ShieldCheck,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadedDocument {
  id: string
  filename: string
  storage_path: string
  url: string
  status: "pending" | "processing" | "done" | "error"
  created_at: string
  uploaded_by: string | null
}

interface UploadFile {
  id: string
  file: File
  progress: number
  status: "queued" | "uploading" | "done" | "error"
  error?: string
  result?: UploadedDocument
}

interface DocumentUploadPanelProps {
  userId?: string | null
}

export default function DocumentUploadPanel({ userId }: DocumentUploadPanelProps) {
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([])
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocs(true)
    try {
      const r = await fetch("/api/documents")
      const data = await r.json()
      if (data.documents) setDocuments(data.documents)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingDocs(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const uploadFile = useCallback(async (item: UploadFile) => {
    setUploadQueue((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: "uploading", progress: 15 } : f))
    )

    const fd = new FormData()
    fd.append("file", item.file)
    if (userId) fd.append("userId", userId)

    try {
      const progressInterval = setInterval(() => {
        setUploadQueue((prev) =>
          prev.map((f) =>
            f.id === item.id && f.progress < 85
              ? { ...f, progress: f.progress + Math.random() * 15 }
              : f
          )
        )
      }, 300)

      const r = await fetch("/api/documents/upload", { method: "POST", body: fd })
      clearInterval(progressInterval)

      const data = await r.json()

      if (!r.ok || data.error) {
        setUploadQueue((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: "error", progress: 0, error: data.error || "Upload gagal" }
              : f
          )
        )
        return
      }

      setUploadQueue((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? { ...f, status: "done", progress: 100, result: data.document }
            : f
        )
      )

      setTimeout(async () => {
        const r2 = await fetch("/api/documents")
        const d2 = await r2.json()
        if (d2.documents) setDocuments(d2.documents)
      }, 600)
    } catch {
      setUploadQueue((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "error", progress: 0, error: "Koneksi terputus" } : f
        )
      )
    }
  }, [userId])

  const addFiles = useCallback((files: File[]) => {
    const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith(".pdf"))
    if (pdfFiles.length === 0) return

    const newItems: UploadFile[] = pdfFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      progress: 0,
      status: "queued",
    }))

    setUploadQueue((prev) => [...prev, ...newItems])

    newItems.forEach((item, i) => {
      setTimeout(() => uploadFile(item), i * 300)
    })
  }, [uploadFile])

  const removeFromQueue = useCallback((id: string) => {
    setUploadQueue((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleDeleteDocument = useCallback(async (docId: string) => {
    setDeletingId(docId)
    try {
      const r = await fetch(`/api/documents/${docId}`, { method: "DELETE" })
      if (r.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setDeletingId(null)
    }
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      dragCounterRef.current = 0
      const files = Array.from(e.dataTransfer.files)
      addFiles(files)
    },
    [addFiles]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(Array.from(e.target.files))
        e.target.value = ""
      }
    },
    [addFiles]
  )

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
  }

  const statusConfig = {
    pending: {
      label: "MENUNGGU VEKTOR",
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-400/10 border-amber-400/20",
    },
    processing: {
      label: "PROSES EMBEDDING",
      icon: Loader2,
      color: "text-cyan-400",
      bg: "bg-cyan-400/10 border-cyan-400/20",
    },
    done: {
      label: "TERINDEKS PINECONE",
      icon: FileCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10 border-emerald-400/20",
    },
    error: {
      label: "GAGAL INDEKS",
      icon: AlertCircle,
      color: "text-red-400",
      bg: "bg-red-400/10 border-red-400/20",
    },
  }

  return (
    <div className="flex flex-col h-full bg-[#070709] text-neutral-200 overflow-hidden">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-white/[0.08] bg-[#070709]/80 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
            <Database className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">KNOWLEDGE BASE REPOSITORY</h2>
            <p className="text-[10px] text-neutral-500 font-mono tracking-widest uppercase">
              {documents.length} DOKUMEN RESMI TERDAFTAR // VECTOR STORE
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchDocuments}
          disabled={isLoadingDocs}
          className="p-2 text-neutral-400 hover:text-white hover:bg-white/[0.05] rounded-xl border border-white/10 transition-colors"
          title="Sinkronkan dokumen"
        >
          <RefreshCw className={cn("h-4 w-4", isLoadingDocs && "animate-spin")} />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 chat-scroll max-w-5xl mx-auto w-full">
        {/* Modern Brutalist Drag & Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative cursor-pointer rounded-2xl border-2 border-dashed p-8 transition-all duration-200",
            "flex flex-col items-center justify-center gap-3 text-center",
            "hover:border-emerald-500/50 hover:bg-white/[0.02]",
            isDragging
              ? "border-emerald-400 bg-emerald-500/10 scale-[1.01]"
              : "border-white/10 bg-[#0D0E14]/40"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />

          <div
            className={cn(
              "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-200",
              isDragging
                ? "bg-emerald-500/20 scale-110"
                : "bg-white/[0.04] border border-white/10"
            )}
          >
            <UploadCloud
              className={cn(
                "h-6 w-6 transition-colors",
                isDragging ? "text-emerald-400" : "text-neutral-400"
              )}
            />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">
              {isDragging ? "Lepaskan PDF untuk mulai proses vektorisasi" : "Tarik & Lepas Dokumen PDF ke Sini"}
            </p>
            <p className="text-xs text-neutral-500">
              atau <span className="text-emerald-400 underline underline-offset-2 font-medium">pilih file dari perangkat</span>
              {" "}• Maks 50 MB • Format: PDF Regulasi / Panduan
            </p>
          </div>
        </div>

        {/* Upload Queue Progress */}
        {uploadQueue.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">
              Antrian Ingest Vektor ({uploadQueue.length})
            </p>
            <div className="space-y-2">
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-xl border px-4 py-3 transition-all duration-300",
                    item.status === "done"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : item.status === "error"
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-white/10 bg-[#0D0E14]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {item.status === "done" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : item.status === "error" ? (
                        <AlertCircle className="h-5 w-5 text-red-400" />
                      ) : item.status === "uploading" ? (
                        <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
                      ) : (
                        <FileText className="h-5 w-5 text-neutral-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{item.file.name}</p>
                      <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        {formatBytes(item.file.size)}
                        {item.error && (
                          <span className="text-red-400 ml-2">❌ {item.error}</span>
                        )}
                      </p>

                      {(item.status === "uploading" || item.status === "queued") && (
                        <div className="mt-2 h-1 rounded-full bg-white/[0.08] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {(item.status === "done" || item.status === "error") && (
                      <button
                        type="button"
                        onClick={() => removeFromQueue(item.id)}
                        className="p-1.5 text-neutral-500 hover:text-white transition-colors flex-shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing Documents List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">
              Daftar Dokumen Basis Pengetahuan
            </p>
            {isLoadingDocs && <Loader2 className="h-3.5 w-3.5 text-emerald-400 animate-spin" />}
          </div>

          {documents.length === 0 && !isLoadingDocs ? (
            <div className="py-14 text-center rounded-2xl border border-white/[0.06] bg-white/[0.01]">
              <FileText className="h-8 w-8 text-neutral-600 mx-auto mb-3" />
              <p className="text-xs text-neutral-400 font-mono">Belum ada dokumen PDF diunggah</p>
              <p className="text-[11px] text-neutral-600 mt-1">Upload PDF untuk memulai pembentukan indeks Pinecone</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const cfg = statusConfig[doc.status] || statusConfig.pending
                const StatusIcon = cfg.icon
                return (
                  <div
                    key={doc.id}
                    className="group rounded-xl border border-white/[0.08] bg-[#0D0E14]/60 px-4 py-3 hover:border-white/20 hover:bg-[#0D0E14] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-emerald-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{doc.filename}</p>
                        <div className="flex items-center gap-2.5 mt-1">
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {formatDate(doc.created_at)}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono border",
                              cfg.bg,
                              cfg.color
                            )}
                          >
                            <StatusIcon
                              className={cn(
                                "h-2.5 w-2.5",
                                doc.status === "processing" && "animate-spin"
                              )}
                            />
                            {cfg.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
                            title="Buka dokumen PDF"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={deletingId === doc.id}
                          className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-white/[0.05] transition-colors disabled:opacity-50"
                          title="Hapus dari basis data"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer System Telemetry */}
      <footer className="px-6 py-3 border-t border-white/[0.08] bg-black/40">
        <p className="text-[10px] text-neutral-500 font-mono text-center">
          DOKUMEN DIINDISIKAN KE PINECONE &amp; DIEVALUASI MELALUI COHERE RERANK v3.0 PADA WORKFLOW N8N
        </p>
      </footer>
    </div>
  )
}
