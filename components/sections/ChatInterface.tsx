"use client"

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  FormEvent,
} from "react"
import { useN8nTrigger } from "@/hooks/useN8nTrigger"
import { useChatRealtime } from "@/hooks/useChatRealtime"
import { useAuth } from "@/hooks/useAuth"
import { cn, formatRelativeTime } from "@/lib/utils"
import { exportChatAsText, downloadTextFile } from "@/lib/export-chat"
import type { ChatMessage, ChatSession, ChatFile, UserProfile } from "@/lib/supabase"
import DocumentUploadPanel from "@/components/sections/DocumentUploadPanel"
import {
  Send,
  Loader2,
  Edit3,
  Trash2,
  Check,
  X,
  RefreshCw,
  Paperclip,
  FileText,
  XCircle,
  Menu,
  MessageSquare,
  Search,
  Copy,
  CheckCircle2,
  RotateCcw,
  Download,
  ThumbsUp,
  ThumbsDown,
  Plus,
  LogOut,
  FolderOpen,
  Sparkles,
  Database,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Bot,
  CornerDownLeft,
} from "lucide-react"

interface ChatInterfaceProps {
  initialSessions: ChatSession[]
  initialMessages: ChatMessage[]
  initialSessionId?: string | null
}

type UILocalMessage = ChatMessage & {
  isPlaceholder?: boolean
  files?: ChatFile[]
}

const HISTORY_WINDOW = 50
const HISTORY_CHAR_LIMIT = 8000
const NAME_CAPTURE_REGEX = /\bnama\s+saya\s+([^.?!,\n\r]+)/i
const FALLBACK_NAME_CONTEXT = "Nama tidak diketahui. Jika pengguna belum menyebut nama, tanyakan namanya dan jangan menebak."

const SUGGESTED_QUESTIONS = [
  {
    category: "AKADEMIK & SKRIPSI",
    text: "Berapa batas SKS minimal untuk seminar proposal & yudisium?",
    icon: Sparkles,
  },
  {
    category: "KURIKULUM & KRS",
    text: "Bagaimana aturan konversi nilai dan dispensasi KRS terlambat?",
    icon: Database,
  },
  {
    category: "BEASISWA & PRESTASI",
    text: "Apa syarat pendaftaran beasiswa unggulan & alumni UII?",
    icon: ShieldCheck,
  },
  {
    category: "REGULASI & ETIKA",
    text: "Sanksi dan prosedur komisi disiplin terhadap plagiarisme di UII?",
    icon: Layers,
  },
]

function buildHistoryPayload(
  historyMessages: UILocalMessage[],
  extraMessage?: UILocalMessage,
  contextMessage?: { role: "system"; content: string }
) {
  const combined = extraMessage ? [...historyMessages, extraMessage] : [...historyMessages]
  const sanitized = combined.filter((m) => m && typeof m.content === "string")
  const windowed = sanitized.slice(-HISTORY_WINDOW)
  const capped: UILocalMessage[] = []
  let total = 0
  for (let i = windowed.length - 1; i >= 0; i--) {
    const msg = windowed[i]
    const content = msg.content ?? ""
    capped.push({ ...msg, content })
    total += content.length
    if (total >= HISTORY_CHAR_LIMIT) break
  }
  const mappedHistory = capped.reverse().map((m) => ({ role: m.role, content: m.content }))
  if (contextMessage) return [contextMessage, ...mappedHistory]
  return mappedHistory
}

async function persistUserName(userId: string, displayName: string): Promise<UserProfile | null> {
  try {
    const response = await fetch(`/api/profiles/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName }),
    })
    if (!response.ok) throw new Error("Failed to update profile")
    const data = await response.json()
    return data.profile ?? null
  } catch (error) {
    console.error("persistUserName error:", error)
    return null
  }
}

function resolveUserContextMessage(userContext: string | null, fallbackContext: string) {
  if (userContext && userContext.trim()) return { role: "system" as const, content: userContext }
  return { role: "system" as const, content: fallbackContext }
}

function buildUserContext(user: ReturnType<typeof useAuth>["user"], profile: UserProfile | null) {
  const name = profile?.display_name || user?.user_metadata?.full_name || user?.email || null
  const tone = profile?.tone
  const interests = profile?.interests
  const lang = profile?.lang
  const parts: string[] = []
  if (name) parts.push(`User name: ${name}`)
  if (tone) parts.push(`Preferred tone: ${tone}`)
  if (interests) parts.push(`Interests: ${interests}`)
  if (lang) parts.push(`Preferred language: ${lang}`)
  if (parts.length === 0) return null
  return ["User context:", parts.join(" | "), "If unsure about the name, ask for confirmation and never invent a new name."].join(" ")
}

function ChatInterface({ initialSessions, initialMessages, initialSessionId = null }: ChatInterfaceProps) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions)
  const fetchSessionsAbortController = useRef<AbortController | null>(null)
  const loadSessionAbortController = useRef<AbortController | null>(null)
  const [messages, setMessages] = useState<UILocalMessage[]>(initialMessages.length ? initialMessages : [])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId)
  const [activeView, setActiveView] = useState<"chat" | "upload">("chat")
  const [inputValue, setInputValue] = useState("")
  const [historyLoading, setHistoryLoading] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [sessionActionLoading, setSessionActionLoading] = useState<string | null>(null)
  const [isRefreshingSessions, setIsRefreshingSessions] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [isSessionListOpen, setIsSessionListOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingMessageContent, setEditingMessageContent] = useState("")
  const [isUpdatingMessage, setIsUpdatingMessage] = useState(false)
  const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState<string | null>(null)
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, "up" | "down">>({})
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageUrlsRef = useRef<Map<number, string>>(new Map())
  const recentlyPersistedMessages = useRef<Set<string>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { user, signOut } = useAuth()
  const { trigger, isLoading } = useN8nTrigger()

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px"
    }
  }, [inputValue])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!user?.id) return
    fetch(`/api/profiles/${user.id}`)
      .then((r) => r.json())
      .then((data) => { if (data.profile) setProfile(data.profile) })
      .catch(console.error)
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    setIsLoadingSessions(true)
    fetchSessionsAbortController.current?.abort()
    fetchSessionsAbortController.current = new AbortController()
    fetch(`/api/chat/sessions?userId=${user?.id}`, { signal: fetchSessionsAbortController.current.signal })
      .then((r) => r.json())
      .then((data) => { if (data.sessions) setSessions(data.sessions) })
      .catch((e) => { if (e.name !== "AbortError") console.error(e) })
      .finally(() => setIsLoadingSessions(false))
  }, [user?.id])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (isLoading) {
      setElapsedSeconds(0)
      interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    } else {
      setElapsedSeconds(0)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isLoading])

  const refreshSessions = useCallback(async () => {
    setIsRefreshingSessions(true)
    try {
      const r = await fetch(`/api/chat/sessions?userId=${user?.id}`)
      const data = await r.json()
      if (data.sessions) setSessions(data.sessions)
    } catch (e) { console.error(e) }
    finally { setIsRefreshingSessions(false) }
  }, [user?.id])

  const handleNewChat = useCallback(async () => {
    if (isLoading || isCreatingSession) return
    setIsCreatingSession(true)
    try {
      const r = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Percakapan Baru", userId: user?.id })
      })
      const data = await r.json()
      if (data.session) {
        setSessions((prev) => [data.session, ...prev])
        setActiveSessionId(data.session.id)
        setMessages([])
        setInputValue("")
        setAttachedFiles([])
      }
    } catch (e) { console.error(e) }
    finally { setIsCreatingSession(false) }
  }, [isLoading, isCreatingSession, user?.id])

  const loadSession = useCallback(async (sessionId: string) => {
    if (sessionId === activeSessionId) return
    setHistoryLoading(true)
    setActiveSessionId(sessionId)
    setMessages([])
    loadSessionAbortController.current?.abort()
    loadSessionAbortController.current = new AbortController()
    try {
      const r = await fetch(`/api/chat/sessions/${sessionId}/messages`, { signal: loadSessionAbortController.current.signal })
      const data = await r.json()
      if (data.messages) setMessages(data.messages)
    } catch (e) { if ((e as Error).name !== "AbortError") console.error(e) }
    finally { setHistoryLoading(false) }
  }, [activeSessionId])

  const handleSend = useCallback(async (customText?: string) => {
    const textToSend = customText !== undefined ? customText : inputValue
    if ((!textToSend.trim() && attachedFiles.length === 0) || isLoading || uploadingFiles) return
    const content = textToSend.trim()
    setInputValue("")

    let sessionId = activeSessionId
    if (!sessionId) {
      setIsCreatingSession(true)
      try {
        const title = content.slice(0, 40) || "Percakapan Baru"
        const r = await fetch("/api/chat/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, userId: user?.id })
        })
        const data = await r.json()
        if (data.session) {
          sessionId = data.session.id
          setActiveSessionId(sessionId)
          setSessions((prev) => [data.session, ...prev])
        }
      } catch (e) { console.error(e) }
      finally { setIsCreatingSession(false) }
    }
    if (!sessionId) return

    let uploadedFiles: ChatFile[] = []
    if (attachedFiles.length > 0) {
      setUploadingFiles(true)
      try {
        const fd = new FormData()
        attachedFiles.forEach((f) => fd.append("files", f))
        fd.append("sessionId", sessionId)
        const r = await fetch("/api/chat/files/upload", { method: "POST", body: fd })
        const data = await r.json()
        if (data.files) uploadedFiles = data.files
      } catch (e) { console.error(e) }
      finally { setUploadingFiles(false) }
    }
    setAttachedFiles([])
    imageUrlsRef.current.clear()

    const userMsg: UILocalMessage = {
      id: `local-user-${Date.now()}`,
      session_id: sessionId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
      files: uploadedFiles,
    }
    const placeholderMsg: UILocalMessage = {
      id: `local-assistant-${Date.now()}`,
      session_id: sessionId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      isPlaceholder: true,
    }

    setMessages((prev) => [...prev, userMsg, placeholderMsg])

    const nameMatch = NAME_CAPTURE_REGEX.exec(content)
    if (nameMatch && user?.id) {
      const capturedName = nameMatch[1].trim()
      persistUserName(user.id, capturedName).then((updated) => { if (updated) setProfile(updated) })
    }

    const userContext = buildUserContext(user, profile)
    const contextMessage = resolveUserContextMessage(userContext, FALLBACK_NAME_CONTEXT)
    const history = buildHistoryPayload(messages, userMsg, contextMessage)
    const fileContext = uploadedFiles.length > 0 ? `\n\n[File terlampir: ${uploadedFiles.map((f) => f.file_name).join(", ")}]` : ""

    try {
      const r = await trigger({ message: content + fileContext, history, sessionId, files: uploadedFiles })
      if (r?.data?.text) {
        const assistantMsgData = { role: "assistant" as const, content: r.data.text, session_id: sessionId }
        const savedR = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assistantMsgData)
        })
        const savedData = await savedR.json()
        const savedMsg: UILocalMessage = savedData.message ?? { ...assistantMsgData, id: `saved-${Date.now()}`, created_at: new Date().toISOString() }
        recentlyPersistedMessages.current.add(savedMsg.id)
        setTimeout(() => recentlyPersistedMessages.current.delete(savedMsg.id), 5000)

        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.isPlaceholder && m.role === "assistant")
          if (idx >= 0) { const updated = [...prev]; updated[idx] = savedMsg; return updated }
          return prev
        })

        const userMsgData = { role: "user" as const, content, session_id: sessionId, fileIds: uploadedFiles.map((f) => f.id) }
        const savedUserR = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userMsgData)
        })
        const savedUserData = await savedUserR.json()
        if (savedUserData.message) {
          recentlyPersistedMessages.current.add(savedUserData.message.id)
          setTimeout(() => recentlyPersistedMessages.current.delete(savedUserData.message.id), 5000)
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === userMsg.id)
            if (idx >= 0) { const updated = [...prev]; updated[idx] = { ...savedUserData.message, files: uploadedFiles }; return updated }
            return prev
          })
        }

        if (messages.length === 0 || (messages.length === 1 && messages[0].isPlaceholder)) {
          const titleR = await fetch(`/api/chat/sessions/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: content.slice(0, 40) })
          })
          const titleData = await titleR.json()
          if (titleData.session) setSessions((prev) => prev.map((s) => s.id === sessionId ? titleData.session : s))
        }
      }
    } catch (e) {
      console.error(e)
      setMessages((prev) => prev.filter((m) => !m.isPlaceholder))
    }
  }, [inputValue, attachedFiles, isLoading, uploadingFiles, activeSessionId, messages, user, profile, trigger])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }, [handleSend])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)]); e.target.value = "" }
  }, [])

  const handleRemoveFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleCopyMessage = useCallback(async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedMessageId(id)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }, [])

  const handleStartEditMessage = useCallback((id: string, content: string) => {
    setEditingMessageId(id); setEditingMessageContent(content)
  }, [])

  const handleCancelEditMessage = useCallback(() => {
    setEditingMessageId(null); setEditingMessageContent("")
  }, [])

  const handleSaveEditMessage = useCallback(async (messageId: string) => {
    if (!editingMessageContent.trim() || !activeSessionId) return
    setIsUpdatingMessage(true)
    try {
      const r = await fetch(`/api/chat/sessions/${activeSessionId}/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingMessageContent })
      })
      const data = await r.json()
      if (data.message) {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, content: editingMessageContent, _updatedAt: Date.now() } as any : m))
        setEditingMessageId(null); setEditingMessageContent("")
      }
    } catch (e) { console.error(e) } finally { setIsUpdatingMessage(false) }
  }, [editingMessageContent, activeSessionId])

  const handleRegenerateResponse = useCallback(async (messageId: string) => {
    if (isLoading || !activeSessionId) return
    const msgIndex = messages.findIndex((m) => m.id === messageId)
    if (msgIndex < 0) return
    const prevUserMsg = messages.slice(0, msgIndex).reverse().find((m) => m.role === "user")
    if (!prevUserMsg) return
    const placeholder: UILocalMessage = { id: `regen-${Date.now()}`, session_id: activeSessionId, role: "assistant", content: "", created_at: new Date().toISOString(), isPlaceholder: true }
    setMessages((prev) => { const updated = [...prev]; updated[msgIndex] = placeholder; return updated })
    const userContext = buildUserContext(user, profile)
    const contextMessage = resolveUserContextMessage(userContext, FALLBACK_NAME_CONTEXT)
    const history = buildHistoryPayload(messages.slice(0, msgIndex), undefined, contextMessage)
    try {
      const r = await trigger({ message: prevUserMsg.content, history, sessionId: activeSessionId })
      if (r?.data?.text) {
        const updatedMsg: UILocalMessage = { id: messageId, session_id: activeSessionId, role: "assistant", content: r.data.text, created_at: new Date().toISOString() }
        await fetch(`/api/chat/sessions/${activeSessionId}/messages/${messageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: r.data.text })
        })
        setMessages((prev) => prev.map((m) => m.id === placeholder.id ? updatedMsg : m))
      }
    } catch (e) { console.error(e) }
  }, [isLoading, activeSessionId, messages, user, profile, trigger])

  const handleExportChat = useCallback(() => {
    if (messages.length === 0) return
    const session = sessions.find((s) => s.id === activeSessionId)
    const text = exportChatAsText(session!, messages)
    downloadTextFile(text, `aurauii-chat-${Date.now()}.txt`)
  }, [messages, sessions, activeSessionId])

  const startRenameSession = useCallback((session: ChatSession) => {
    setEditingSessionId(session.id); setEditingTitle(session.title || "")
  }, [])

  const cancelRenameSession = useCallback(() => {
    setEditingSessionId(null); setEditingTitle("")
  }, [])

  const handleRenameSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!editingSessionId || !editingTitle.trim()) return
    setSessionActionLoading(editingSessionId)
    try {
      const r = await fetch(`/api/chat/sessions/${editingSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingTitle.trim() })
      })
      const data = await r.json()
      if (data.session) setSessions((prev) => prev.map((s) => s.id === editingSessionId ? data.session : s))
      setEditingSessionId(null); setEditingTitle("")
    } catch (e) { console.error(e) } finally { setSessionActionLoading(null) }
  }, [editingSessionId, editingTitle])

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    setSessionActionLoading(sessionId)
    try {
      await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" })
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (activeSessionId === sessionId) { setActiveSessionId(null); setMessages([]) }
      setPendingDeleteSessionId(null)
    } catch (e) { console.error(e) } finally { setSessionActionLoading(null) }
  }, [activeSessionId])

  const TypingIndicator = () => (
    <div className="flex items-center gap-3 text-neutral-300 py-1">
      <div className="flex items-center gap-1.5">
        <span className="block h-2 w-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="block h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="block h-2 w-2 rounded-full bg-emerald-400 animate-bounce" />
      </div>
      <div className="flex items-center gap-2 font-mono text-[11px] tracking-wide text-neutral-400">
        <span className="text-emerald-400 uppercase">AURA REASONING</span>
        <span className="text-neutral-600">//</span>
        <span>Menganalisis basis pengetahuan & merumuskan sitasi</span>
        {elapsedSeconds > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-emerald-400 font-mono text-[10px]">
            {elapsedSeconds}s
          </span>
        )}
      </div>
    </div>
  )

  const renderMessageBubble = (message: UILocalMessage) => {
    const isUser = message.role === "user"
    const files = message.files || []
    const isCopied = copiedMessageId === message.id
    const isEditing = editingMessageId === message.id && isUser

    return (
      <div
        className={cn("flex flex-col gap-2 group w-full", isUser ? "items-end" : "items-start")}
        style={isEditing ? { direction: "ltr" } : undefined}
      >
        {/* Metadata Label Above Bubble */}
        <div className={cn("flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-neutral-500 px-1", isUser ? "flex-row-reverse" : "flex-row")}>
          {!isUser ? (
            <>
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>AURA.CORE</span>
              </div>
              <span className="text-neutral-700">/</span>
              <span className="text-neutral-400">RAG ASSISTANT</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span>YOU</span>
              </div>
            </>
          )}
          {message.created_at && (
            <>
              <span className="text-neutral-700">/</span>
              <span>{formatRelativeTime(message.created_at)}</span>
            </>
          )}
        </div>

        {/* Message Container */}
        <div className={cn("flex flex-col gap-2 max-w-[85%] md:max-w-[78%]", isUser ? "items-end" : "items-start")}>
          {/* Files Preview */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((file) => {
                const isImage = file.file_type.startsWith("image/")
                if (isImage && file.storage_url) {
                  return (
                    <a
                      key={file.id}
                      href={file.storage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl overflow-hidden border border-white/10 bg-black/40 hover:border-emerald-500/50 transition-all"
                    >
                      <img
                        src={file.storage_url}
                        alt={file.file_name}
                        className="max-h-[260px] max-w-[360px] object-contain hover:opacity-90 transition-opacity"
                        loading="lazy"
                      />
                    </a>
                  )
                }
                return (
                  <a
                    key={file.id}
                    href={file.storage_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs bg-white/[0.04] border border-white/10 text-neutral-300 hover:text-white hover:border-emerald-400/40 hover:bg-white/[0.08] transition-all font-mono"
                  >
                    <FileText className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="truncate max-w-[200px]">{file.file_name}</span>
                  </a>
                )
              })}
            </div>
          )}

          {/* Message Content Bubble */}
          {(message.content || message.isPlaceholder) && (
            <div
              className={cn(
                "relative text-sm leading-relaxed transition-all shadow-xl",
                isUser
                  ? "px-5 py-3.5 rounded-2xl rounded-tr-xs bg-white/[0.06] border border-white/[0.12] text-neutral-100"
                  : "px-6 py-5 rounded-2xl rounded-tl-xs bg-[#0D0E14] border border-white/[0.08] text-neutral-200",
                isEditing && "w-full"
              )}
              style={isEditing ? { direction: "ltr", textAlign: "left" } : undefined}
            >
              {isEditing ? (
                <div className="flex flex-col gap-2 w-full" dir="ltr">
                  <textarea
                    value={editingMessageContent}
                    onChange={(e) => setEditingMessageContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSaveEditMessage(message.id) }
                      else if (e.key === "Escape") { e.preventDefault(); handleCancelEditMessage() }
                    }}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-black/60 text-white border border-white/20 focus:outline-none focus:border-emerald-400 resize-none min-h-[70px] font-sans"
                    autoFocus
                    disabled={isUpdatingMessage}
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={handleCancelEditMessage}
                      disabled={isUpdatingMessage}
                      className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEditMessage(message.id)}
                      disabled={isUpdatingMessage || !editingMessageContent.trim()}
                      className="px-3 py-1.5 text-xs bg-emerald-500 text-black font-semibold rounded-lg hover:bg-emerald-400 disabled:opacity-50 transition-colors"
                    >
                      {isUpdatingMessage ? <Loader2 className="h-3 w-3 animate-spin" /> : "Simpan Perubahan"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap break-words selection:bg-emerald-500/20">
                    {message.isPlaceholder && !message.content ? "" : message.content?.replace(/\n\n\[File terlampir:.*?\]/g, "").trim() || ""}
                  </p>
                  {message.isPlaceholder && <TypingIndicator />}
                </>
              )}
            </div>
          )}

          {/* Action Toolbar */}
          {!message.isPlaceholder && !isEditing && (
            <div className={cn("flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 px-1", isUser ? "flex-row-reverse" : "flex-row")}>
              {isUser && (
                <button
                  type="button"
                  onClick={() => handleStartEditMessage(message.id, message.content)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                  title="Edit pesan"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleCopyMessage(message.content, message.id)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                title="Salin teks"
              >
                {isCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              {!isUser && (
                <>
                  <button
                    type="button"
                    onClick={() => handleRegenerateResponse(message.id)}
                    disabled={isLoading}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-50"
                    title="Generate ulang jawaban"
                  >
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackGiven((p) => ({ ...p, [message.id]: "up" }))}
                    className={cn("p-1.5 rounded-lg transition-colors", feedbackGiven[message.id] === "up" ? "text-emerald-400 bg-emerald-500/10" : "text-neutral-400 hover:text-white hover:bg-white/[0.08]")}
                    title="Jawaban akurat"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackGiven((p) => ({ ...p, [message.id]: "down" }))}
                    className={cn("p-1.5 rounded-lg transition-colors", feedbackGiven[message.id] === "down" ? "text-red-400 bg-red-500/10" : "text-neutral-400 hover:text-white hover:bg-white/[0.08]")}
                    title="Perlu perbaikan"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const formatSessionTitle = (session: ChatSession) => session.title || "Percakapan Baru"

  const handleRealtimeInsert = useCallback((message: ChatMessage) => {
    if (!message || message.session_id !== activeSessionId) return
    if (recentlyPersistedMessages.current.has(message.id)) return
    setMessages((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === message.id)
      if (existingIndex >= 0) {
        const updated = [...prev]; updated[existingIndex] = { ...message, files: prev[existingIndex].files || undefined }; return updated
      }
      const placeholderIndex = prev.findIndex((item) => item.isPlaceholder && item.role === message.role && item.session_id === message.session_id)
      if (placeholderIndex >= 0 && message.role === "assistant") {
        const updated = [...prev]; updated[placeholderIndex] = message; return updated
      }
      const duplicateByContent = prev.find((item) => item.content === message.content && item.session_id === message.session_id && item.role === message.role && item.id !== message.id && Math.abs(new Date(item.created_at || 0).getTime() - new Date(message.created_at || 0).getTime()) < 30000)
      if (duplicateByContent) return prev
      if (message.role === "assistant") {
        const sessionAssistants = prev.filter((item) => item.role === "assistant" && item.session_id === message.session_id)
        const similarMessage = sessionAssistants.find((item) => {
          if (item.id === message.id) return false
          const itemStart = item.content.substring(0, Math.min(150, item.content.length)).trim()
          const messageStart = message.content.substring(0, Math.min(150, message.content.length)).trim()
          return itemStart.length > 50 && messageStart.length > 50 && itemStart === messageStart
        })
        if (similarMessage) return prev
        const recentAssistants = sessionAssistants.filter((item) => Math.abs(new Date(item.created_at || 0).getTime() - new Date(message.created_at || 0).getTime()) < 5000)
        if (recentAssistants.length > 0) return prev
      }
      return [...prev, message]
    })
  }, [activeSessionId])

  useChatRealtime(activeSessionId, handleRealtimeInsert)

  const filteredSessions = sessions.filter((session) => {
    if (!user?.id || !session.user_id || session.user_id !== user.id) return false
    if (searchQuery.trim()) {
      const title = formatSessionTitle(session).toLowerCase()
      if (!title.includes(searchQuery.toLowerCase().trim())) return false
    }
    return true
  })

  return (
    <div className="flex h-screen w-full bg-[#070709] text-neutral-200 overflow-hidden font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Mobile overlay */}
      {isSessionListOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-md"
          onClick={() => setIsSessionListOpen(false)}
        />
      )}

      {/* Modern Brutalist Sidebar */}
      <aside className={cn(
        "flex flex-col w-[280px] bg-[#0B0C10] border-r border-white/[0.08]",
        "fixed lg:static inset-y-0 left-0 z-50 lg:z-auto",
        "transform transition-transform duration-300 ease-out",
        isSessionListOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Brand & Technical Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400/20 via-cyan-400/10 to-transparent border border-emerald-400/30 flex items-center justify-center font-mono font-bold text-xs text-emerald-400">
              AU
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight">AURA UII</p>
              <p className="text-[10px] text-emerald-400/80 font-mono tracking-widest uppercase">ACADEMIC RAG // v2.4</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSessionListOpen(false)}
            className="lg:hidden p-1.5 text-neutral-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="p-3 space-y-2">
          <button
            type="button"
            onClick={() => { handleNewChat(); setActiveView("chat"); setIsSessionListOpen(false) }}
            disabled={isLoading || isCreatingSession}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-white/10 hover:border-emerald-500/50 bg-white/[0.02] hover:bg-white/[0.05] text-neutral-200 text-xs font-medium transition-all group shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <Plus className="h-4 w-4 text-emerald-400 group-hover:rotate-90 transition-transform duration-200" />
              <span>{isCreatingSession ? "Menyiapkan Sesi..." : "Inquiry Baru"}</span>
            </div>
            <span className="font-mono text-[10px] text-neutral-500 group-hover:text-emerald-400 transition-colors">⌘N</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveView(activeView === "upload" ? "chat" : "upload"); setIsSessionListOpen(false) }}
            className={cn(
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all text-xs font-medium",
              activeView === "upload"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-white/[0.08] text-neutral-400 hover:text-white hover:bg-white/[0.03]"
            )}
          >
            <div className="flex items-center gap-2.5">
              <FolderOpen className="h-4 w-4" />
              <span>Knowledge Repository</span>
            </div>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.03]">PDF</span>
          </button>
        </div>

        {/* Search Field */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Cari riwayat percakapan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-white/[0.02] border border-white/[0.08] rounded-xl text-neutral-300 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/40 transition-colors font-sans"
            />
          </div>
        </div>

        {/* Session History List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 chat-scroll">
          {isLoadingSessions ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-3 py-2.5 space-y-2 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                <div className="h-3 bg-white/[0.05] rounded animate-pulse w-3/4" />
                <div className="h-2 bg-white/[0.03] rounded animate-pulse w-1/3" />
              </div>
            ))
          ) : filteredSessions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-xs text-neutral-500 font-mono">
                {searchQuery ? "Percakapan tidak ditemukan" : "Belum ada sesi inquiry"}
              </p>
            </div>
          ) : filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId && activeView === "chat"
            const isEditingThis = session.id === editingSessionId
            return (
              <div
                key={session.id}
                className={cn(
                  "group rounded-xl transition-all duration-150 relative",
                  isActive
                    ? "bg-white/[0.06] border border-emerald-500/30 text-white shadow-sm"
                    : "hover:bg-white/[0.03] border border-transparent text-neutral-400 hover:text-neutral-200"
                )}
              >
                {isEditingThis ? (
                  <form onSubmit={handleRenameSubmit} className="p-2 space-y-1.5">
                    <input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      autoFocus
                      placeholder="Judul sesi"
                      className="w-full px-2.5 py-1.5 text-xs bg-black/60 border border-emerald-500/50 rounded-lg text-white focus:outline-none font-sans"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="submit"
                        disabled={sessionActionLoading === session.id}
                        className="flex-1 py-1 text-xs bg-emerald-500 text-black font-semibold rounded-lg hover:bg-emerald-400 transition-colors"
                      >
                        {sessionActionLoading === session.id ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : "Simpan"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelRenameSession}
                        className="flex-1 py-1 text-xs border border-white/10 text-neutral-400 rounded-lg hover:text-white transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { loadSession(session.id); setActiveView("chat"); setIsSessionListOpen(false) }}
                      className="flex-1 text-left px-3 py-2.5 min-w-0"
                    >
                      <div className="flex items-center gap-1.5">
                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        )}
                        <p className={cn("text-xs truncate font-medium", isActive ? "text-white" : "text-neutral-300")}>
                          {formatSessionTitle(session)}
                        </p>
                      </div>
                      {session.created_at && (
                        <p className="text-[10px] text-neutral-500 font-mono mt-0.5 pl-3">
                          {formatRelativeTime(session.created_at)}
                        </p>
                      )}
                    </button>
                    <div className="flex items-center pr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => startRenameSession(session)}
                        className="p-1 text-neutral-500 hover:text-white transition-colors rounded hover:bg-white/10"
                        title="Ubah judul"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteSessionId(session.id)}
                        disabled={sessionActionLoading === session.id}
                        className="p-1 text-neutral-500 hover:text-red-400 transition-colors rounded hover:bg-white/10"
                        title="Hapus sesi"
                      >
                        {sessionActionLoading === session.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* User Account & Logout Footer */}
        <div className="p-3 border-t border-white/[0.08] bg-black/20">
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-emerald-400 flex-shrink-0">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {profile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Mahasiswa"}
                </p>
                <p className="text-[10px] text-neutral-500 font-mono truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.05]"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex flex-col flex-1 min-w-0 bg-[#070709] relative">
        {/* Document Ingestion View */}
        {activeView === "upload" && (
          <DocumentUploadPanel userId={user?.id} />
        )}

        {/* Chat Interface View */}
        <div className={cn("flex flex-col flex-1 min-w-0 h-full", activeView === "upload" && "hidden")}>
          {/* Top Status & Telemetry Bar */}
          <header className="px-5 py-3 border-b border-white/[0.08] bg-[#070709]/80 backdrop-blur-xl flex items-center justify-between z-10 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsSessionListOpen(true)}
                className="lg:hidden p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.05]"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2.5 min-w-0">
                <h1 className="text-sm font-semibold text-white truncate">
                  {activeSessionId ? sessions.find((s) => s.id === activeSessionId)?.title || "Percakapan Aktif" : "AURA UII Workspace"}
                </h1>
                <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-mono text-[9px] uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  RAG ENGINE ACTIVE
                </span>
              </div>
            </div>

            {/* Pipeline Readout & Export */}
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <div className="hidden xl:flex items-center gap-2 text-neutral-500">
                <span>[COHERE-v3]</span>
                <span>→</span>
                <span>[PINECONE]</span>
                <span>→</span>
                <span>[RERANK-3.0]</span>
                <span>→</span>
                <span className="text-cyan-400 font-semibold">[DEEPSEEK-R1]</span>
              </div>

              {isLoading && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>REASONING {elapsedSeconds}s</span>
                </div>
              )}

              {activeSessionId && messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportChat}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.02] text-neutral-300 hover:text-white transition-colors"
                  title="Ekspor transkrip chat"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}
            </div>
          </header>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto chat-scroll p-4 lg:p-6">
            {sessionError && (
              <div className="max-w-4xl mx-auto mb-4 px-4 py-3 rounded-xl bg-red-950/40 border border-red-900/50 text-xs text-red-400 flex items-center justify-between">
                <span>{sessionError}</span>
                <button type="button" onClick={() => setSessionError(null)} className="text-xs underline ml-4">Tutup</button>
              </div>
            )}

            {historyLoading ? (
              <div className="max-w-3xl mx-auto space-y-6 py-8">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={cn("flex flex-col gap-2", i % 2 === 0 ? "items-start" : "items-end")}>
                    <div className="h-3 bg-white/[0.05] rounded w-24 animate-pulse" />
                    <div className={cn("h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse", i % 2 === 0 ? "w-80" : "w-64")} />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              /* Empty Hero State */
              <div className="flex flex-col items-center justify-center min-h-full max-w-4xl mx-auto py-12 px-4 text-center space-y-8">
                {/* Visual Monogram */}
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-neutral-400 font-mono text-[10px] tracking-widest uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    NEURAL RETRIEVAL AUGMENTED GENERATION
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white uppercase font-sans">
                    Tanyakan Apa Saja <br />
                    <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-white bg-clip-text text-transparent">
                      Seputar Regulasi & Kampus UII
                    </span>
                  </h2>
                  <p className="max-w-xl mx-auto text-sm text-neutral-400 leading-relaxed">
                    Sistem RAG resmi yang terhubung langsung dengan basis dokumen peraturan rektorat, kurikulum FTI, skripsi, dan layanan terpadu mahasiswa UII.
                  </p>
                </div>

                {/* 4 Interactive Inquiry Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full text-left">
                  {SUGGESTED_QUESTIONS.map((q) => {
                    const Icon = q.icon
                    return (
                      <button
                        key={q.text}
                        type="button"
                        onClick={() => handleSend(q.text)}
                        className="group relative p-4 rounded-2xl border border-white/[0.08] hover:border-emerald-500/40 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-200 flex flex-col justify-between gap-3 shadow-lg hover:scale-[1.01]"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono text-[9px] tracking-widest text-emerald-400/80 uppercase">
                            {q.category}
                          </span>
                          <Icon className="h-3.5 w-3.5 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
                        </div>
                        <p className="text-xs font-medium text-neutral-200 group-hover:text-white leading-relaxed">
                          {q.text}
                        </p>
                      </button>
                    )
                  })}
                </div>

                {/* Technical Pipeline Info Pills */}
                <div className="pt-4 border-t border-white/[0.06] w-full flex flex-wrap items-center justify-center gap-4 text-[10px] font-mono text-neutral-500">
                  <span>EMBEDDING: COHERE-v3</span>
                  <span>•</span>
                  <span>STORE: SUPABASE STORAGE</span>
                  <span>•</span>
                  <span>INDEX: PINECONE</span>
                  <span>•</span>
                  <span>RERANK: COHERE 3.0</span>
                  <span>•</span>
                  <span>LLM: DEEPSEEK REASONER</span>
                </div>
              </div>
            ) : (
              /* Messages Thread */
              <div className="max-w-4xl mx-auto space-y-6 py-4">
                {messages.map((message) => (
                  <div key={`${message.id}-${message.content.substring(0, 20)}-${(message as any)._updatedAt || Date.now()}`}>
                    {renderMessageBubble(message)}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Agency-Grade Command Input Deck */}
          <div className="px-4 lg:px-8 py-4 border-t border-white/[0.08] bg-[#070709]/90 backdrop-blur-2xl flex-shrink-0">
            <div className="max-w-4xl mx-auto">
              {/* Attached Files Preview Strip */}
              {attachedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => {
                    const isImage = file.type.startsWith("image/")
                    if (isImage && !imageUrlsRef.current.has(index)) imageUrlsRef.current.set(index, URL.createObjectURL(file))
                    const imageUrl = isImage ? imageUrlsRef.current.get(index) || null : null
                    if (isImage && imageUrl) {
                      return (
                        <div key={index} className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40">
                          <img src={imageUrl} alt={file.name} className="max-h-[120px] max-w-[180px] object-contain" />
                          <button
                            type="button"
                            onClick={() => { URL.revokeObjectURL(imageUrl); imageUrlsRef.current.delete(index); handleRemoveFile(index) }}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/80 hover:bg-red-500 text-white transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    }
                    return (
                      <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-white/[0.04] border border-white/10 text-neutral-300 font-mono">
                        <FileText className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="truncate max-w-[140px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="text-neutral-500 hover:text-white transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Floating Command Box */}
              <div className="relative rounded-2xl border border-white/[0.12] bg-[#0D0E14]/80 backdrop-blur-xl focus-within:border-emerald-500/50 transition-all shadow-2xl p-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx,.txt,.csv"
                />

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || uploadingFiles}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors flex-shrink-0"
                    title="Lampirkan dokumen / gambar"
                  >
                    {uploadingFiles ? <Loader2 className="h-4 w-4 animate-spin text-emerald-400" /> : <Paperclip className="h-4 w-4" />}
                  </button>

                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tanyakan regulasi, syarat skripsi, KRS, atau beasiswa UII..."
                    disabled={isLoading || uploadingFiles}
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 resize-none focus:outline-none py-1.5 max-h-[160px] leading-relaxed font-sans"
                    style={{ scrollbarWidth: "none" }}
                  />

                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={(!inputValue.trim() && attachedFiles.length === 0) || isLoading || uploadingFiles}
                    className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200",
                      (!inputValue.trim() && attachedFiles.length === 0) || isLoading || uploadingFiles
                        ? "bg-white/[0.04] text-neutral-600 cursor-not-allowed border border-white/[0.06]"
                        : "bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95 shadow-[0_0_15px_rgba(0,245,160,0.3)] font-bold"
                    )}
                    title="Kirim pesan"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Bottom Keyboard Hint */}
              <div className="flex items-center justify-between px-2 pt-2 text-[10px] font-mono text-neutral-500">
                <span>ENTER UNTUK MENGIRIM • SHIFT+ENTER UNTUK BARIS BARU</span>
                <span className="hidden sm:inline">RAG RETRIEVAL ENGINE: CONNECTED</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      {pendingDeleteSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="w-full max-w-sm bg-[#0B0C10] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Hapus Sesi Percakapan?</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Semua riwayat dialog dan lampiran dalam sesi ini akan dihapus permanen dari Supabase.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteSessionId(null)}
                className="flex-1 py-2 text-xs border border-white/10 text-neutral-300 rounded-xl hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSession(pendingDeleteSessionId)}
                disabled={sessionActionLoading === pendingDeleteSessionId}
                className="flex-1 py-2 text-xs bg-red-500 text-white font-semibold rounded-xl hover:bg-red-400 transition-colors disabled:opacity-50"
              >
                {sessionActionLoading === pendingDeleteSessionId ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Hapus Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatInterface