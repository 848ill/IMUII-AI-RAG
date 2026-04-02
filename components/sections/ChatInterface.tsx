"use client"

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  FormEvent,
} from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useN8nTrigger } from "@/hooks/useN8nTrigger"
import { useChatRealtime } from "@/hooks/useChatRealtime"
import { useAuth } from "@/hooks/useAuth"
import { cn, cleanMarkdown, formatRelativeTime } from "@/lib/utils"
import { typeWriterEffect } from "@/lib/typingeffect"
import { exportChatAsText, downloadTextFile } from "@/lib/export-chat"
import type { ChatMessage, ChatSession, ChatFile, UserProfile } from "@/lib/supabase"
import {
  Send,
  Loader2,
  Edit3,
  Trash2,
  Check,
  X,
  RefreshCw,
  Paperclip,
  File,
  Image as ImageIcon,
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

// Build history payload with a larger window but capped total characters to
// avoid overloading the webhook while keeping as much recent context as possible.
// Optional context message (e.g., user identity) is prepended when provided.
function buildHistoryPayload(
  historyMessages: UILocalMessage[],
  extraMessage?: UILocalMessage,
  contextMessage?: { role: "system"; content: string }
) {
  const combined = extraMessage
    ? [...historyMessages, extraMessage]
    : [...historyMessages]

  const sanitized = combined.filter(
    (m) => m && typeof m.content === "string"
  )

  const windowed = sanitized.slice(-HISTORY_WINDOW)

  const capped: UILocalMessage[] = []
  let total = 0

  // Walk from latest to oldest to prioritize most recent exchanges.
  for (let i = windowed.length - 1; i >= 0; i--) {
    const msg = windowed[i]
    const content = msg.content ?? ""
    const nextTotal = total + content.length

    capped.push({ ...msg, content })
    total = nextTotal

    if (total >= HISTORY_CHAR_LIMIT) {
      break
    }
  }

  const mappedHistory = capped.reverse().map((m) => ({
    role: m.role,
    content: m.content,
  }))

  if (contextMessage) {
    return [contextMessage, ...mappedHistory]
  }

  return mappedHistory
}

async function persistUserName(
  userId: string,
  displayName: string
): Promise<UserProfile | null> {
  try {
    const response = await fetch(`/api/profiles/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName }),
    })

    if (!response.ok) {
      throw new Error("Failed to update profile")
    }

    const data = await response.json()
    return data.profile ?? null
  } catch (error) {
    console.error("persistUserName error:", error)
    return null
  }
}

function resolveUserContextMessage(
  userContext: string | null,
  fallbackContext: string
) {
  if (userContext && userContext.trim()) {
    return {
      role: "system" as const,
      content: userContext,
    }
  }

  return {
    role: "system" as const,
    content: fallbackContext,
  }
}

function buildUserContext(
  user: ReturnType<typeof useAuth>["user"],
  profile: UserProfile | null
) {
  const name =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    null

  const tone = profile?.tone
  const interests = profile?.interests
  const lang = profile?.lang

  const parts: string[] = []
  if (name) parts.push(`User name: ${name}`)
  if (tone) parts.push(`Preferred tone: ${tone}`)
  if (interests) parts.push(`Interests: ${interests}`)
  if (lang) parts.push(`Preferred language: ${lang}`)

  if (parts.length === 0) return null

  return [
    "User context:",
    parts.join(" | "),
    "If unsure about the name, ask for confirmation and never invent a new name.",
  ].join(" ")
}

function ChatInterface({
  initialSessions,
  initialMessages,
  initialSessionId = null,
}: ChatInterfaceProps) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions)
  const fetchSessionsAbortController = useRef<AbortController | null>(null)
  const loadSessionAbortController = useRef<AbortController | null>(null)
  const [messages, setMessages] = useState<UILocalMessage[]>(
    initialMessages.length ? initialMessages : []
  )
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialSessionId
  )
  const [inputValue, setInputValue] = useState("")
  const [historyLoading, setHistoryLoading] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [sessionActionLoading, setSessionActionLoading] = useState<
    string | null
  >(null)
  const [isRefreshingSessions, setIsRefreshingSessions] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const imageUrlsRef = useRef<Map<number, string>>(new Map())
  const [isSessionListOpen, setIsSessionListOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, "up" | "down">>({})
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingMessageContent, setEditingMessageContent] = useState("")
  const [isUpdatingMessage, setIsUpdatingMessage] = useState(false)
  const recentlyPersistedMessages = useRef<Set<string>>(new Set())
  const isAutoRegenerating = useRef<boolean>(false)
  const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState<string | null>(null)
  const { trigger, isLoading } = useN8nTrigger()
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setUserProfile(null)
        return
      }
      try {
        const res = await fetch(`/api/profiles/${user.id}`)
        if (!res.ok) throw new Error("Failed to load profile")
        const data = await res.json()
        setUserProfile(data.profile || null)
      } catch (error) {
        console.error("Failed to load profile:", error)
        setUserProfile(null)
      }
    }
    loadProfile()
  }, [user?.id])

  useEffect(() => {
    if (!sessionError) return
    const timeout = setTimeout(() => setSessionError(null), 6000)
    return () => clearTimeout(timeout)
  }, [sessionError])

  // Fetch sessions on mount if user is authenticated and no initial sessions
  // Use initialSessions if available to avoid unnecessary fetch
  useEffect(() => {
    if (user?.id) {
      // Only fetch if we don't have initial sessions
      if (initialSessions.length > 0) {
        setSessions(initialSessions)
      } else if (sessions.length === 0) {
        // Debounce fetch to avoid multiple rapid calls
        const timer = setTimeout(() => {
          fetchSessions()
        }, 100)
        return () => {
          clearTimeout(timer)
          // Cleanup: abort any pending request on unmount
          if (fetchSessionsAbortController.current) {
            fetchSessionsAbortController.current.abort()
            fetchSessionsAbortController.current = null
          }
        }
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (fetchSessionsAbortController.current) {
        fetchSessionsAbortController.current.abort()
        fetchSessionsAbortController.current = null
      }
      if (loadSessionAbortController.current) {
        loadSessionAbortController.current.abort()
        loadSessionAbortController.current = null
      }
    }
  }, [user?.id, initialSessions.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Restore draft from localStorage when session changes
  useEffect(() => {
    if (typeof window === "undefined") return
    
    const draftKey = activeSessionId 
      ? `chat-draft-${activeSessionId}` 
      : "chat-draft-new"
    const savedDraft = localStorage.getItem(draftKey)
    
    // Only restore if there's a saved draft and input is empty
    if (savedDraft && savedDraft.trim() && !inputValue.trim()) {
      setInputValue(savedDraft)
    }
  }, [activeSessionId]) // Only restore when session changes

  // Auto-save draft to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!inputValue.trim()) return

    const draftKey = activeSessionId 
      ? `chat-draft-${activeSessionId}` 
      : "chat-draft-new"
    
    // Debounce: save after 2 seconds of no typing
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, inputValue)
    }, 2000)

    return () => clearTimeout(timer)
  }, [inputValue, activeSessionId])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K: New chat
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        handleNewChat()
        return
      }

      // Escape: Close session list on mobile
      if (e.key === "Escape" && isSessionListOpen) {
        setIsSessionListOpen(false)
        return
      }

      // Cmd+/ or Ctrl+/: Focus search (optional)
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault()
        // Focus search input if exists
        const searchInput = document.querySelector('input[placeholder*="Cari sesi"]') as HTMLInputElement
        searchInput?.focus()
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isSessionListOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSessions = useCallback(async () => {
    if (!user?.id) {
      setSessions([])
      return []
    }

    // Cancel previous request if still pending
    if (fetchSessionsAbortController.current) {
      fetchSessionsAbortController.current.abort()
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController()
    fetchSessionsAbortController.current = abortController

    setIsLoadingSessions(true)
    try {
      const response = await fetch(`/api/chat/sessions?userId=${user.id}`, {
        signal: abortController.signal,
        // Use default cache (browser will respect Cache-Control headers from server)
        cache: "default",
      })
      
      if (!response.ok) {
        if (response.status === 0) {
          // Request was aborted
          return []
        }
        throw new Error("Failed to load sessions")
      }
      
      const data = await response.json()
      const fetched: ChatSession[] = data.sessions ?? []
      
      // Server already filters by userId, so minimal client-side validation
      // Only filter out any edge cases (null user_id)
      const userSessions = fetched.filter(
        (session) => session.user_id === user.id
      )
      
      setSessions(userSessions)
      
      if (
        editingSessionId &&
        !userSessions.some((session) => session.id === editingSessionId)
      ) {
        setEditingSessionId(null)
        setEditingTitle("")
      }
      return userSessions
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === "AbortError") {
        return []
      }
      console.error("Failed to fetch sessions:", error)
      setSessionError("Gagal memuat daftar sesi.")
      return []
    } finally {
      setIsLoadingSessions(false)
      fetchSessionsAbortController.current = null
    }
  }, [editingSessionId, user?.id])

  const refreshSessions = useCallback(async () => {
    setIsRefreshingSessions(true)
    try {
      await fetchSessions()
    } finally {
      setIsRefreshingSessions(false)
    }
  }, [fetchSessions])

  const createSessionOnDemand = useCallback(async (titleSeed: string) => {
    if (!user?.id) {
      setSessionError("Anda harus login untuk membuat sesi chat.")
      return null
    }

    setIsCreatingSession(true)
    try {
      const response = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleSeed, userId: user.id }),
      })

      if (!response.ok) throw new Error("Unable to create session")

      const data = await response.json()
      const session: ChatSession = data.session
      setSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)])
      setActiveSessionId(session.id)
      return session.id
    } catch (error) {
      console.error("createSessionOnDemand error:", error)
      setSessionError("Tidak bisa membuat sesi chat baru. Cek konfigurasi Supabase.")
      return null
    } finally {
      setIsCreatingSession(false)
    }
  }, [user])

  const persistMessage = useCallback(
    async (payload: {
      sessionId: string
      role: "user" | "assistant"
      content: string
      userId?: string | null
    }) => {
      try {
        const response = await fetch(
          `/api/chat/sessions/${payload.sessionId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: payload.role,
              content: payload.content,
              userId: payload.userId,
            }),
          }
        )

        if (!response.ok) throw new Error("Failed to store message")
        const data = await response.json()
        return data.message as ChatMessage
      } catch (error) {
        console.error("persistMessage error:", error)
        setSessionError("Tidak bisa menyimpan pesan. Pastikan Supabase siap.")
        return null
      }
    },
    []
  )

  const loadSession = useCallback(async (sessionId: string) => {
    if (sessionId === activeSessionId) return
    if (!user?.id) {
      setSessionError("Anda harus login untuk memuat sesi chat.")
      return
    }

    // Cancel previous request if still pending
    if (loadSessionAbortController.current) {
      loadSessionAbortController.current.abort()
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController()
    loadSessionAbortController.current = abortController

    setHistoryLoading(true)
    setSessionError(null)
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages?userId=${user.id}`, {
        signal: abortController.signal,
      })
      if (!response.ok) {
        if (response.status === 403) {
          setSessionError("Anda tidak memiliki akses ke sesi ini.")
        } else {
          throw new Error("Failed to load chat history")
        }
        return
      }
      const data = await response.json()
      setMessages(data.messages ?? [])
      setActiveSessionId(sessionId)
      
      // Restore draft for this session after loading
      if (typeof window !== "undefined") {
        const draftKey = `chat-draft-${sessionId}`
        const savedDraft = localStorage.getItem(draftKey)
        if (savedDraft) {
          setInputValue(savedDraft)
        }
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === "AbortError") {
        return
      }
      console.error("loadSession error:", error)
      setSessionError("Gagal memuat riwayat chat.")
    } finally {
      setHistoryLoading(false)
      loadSessionAbortController.current = null
    }
  }, [activeSessionId, user?.id])

  const handleNewChat = () => {
    setActiveSessionId(null)
    setMessages([])
    setSessionError(null)
    setInputValue("")
    setEditingSessionId(null)
    setEditingTitle("")
    
    // Clear draft for new chat
    if (typeof window !== "undefined") {
      localStorage.removeItem("chat-draft-new")
    }
  }

  const determineAssistantReply = (result: any) => {
    if (!result) {
      console.error("❌ determineAssistantReply: result is null/undefined");
      return "Gagal mendapatkan balasan dari AI. Cek log N8N."
    }

    console.log("🔍 determineAssistantReply - result structure:", JSON.stringify(result).substring(0, 300));

    // Format 1: { success: true, data: { text: "..." } }
    if (result.data?.text) {
      const text = result.data.text.trim();
      if (text) return text;
    }

    // Format 2: { data: "string langsung" }
    if (typeof result.data === "string") {
      const text = result.data.trim();
      if (text) return text;
    }

    // Format 3: { data: { message: "..." } }
    if (result.data?.message) {
      const text = String(result.data.message).trim();
      if (text) return text;
    }

    // Format 4: { text: "..." }
    if (result.text) {
      const text = String(result.text).trim();
      if (text) return text;
    }

    // Format 5: { message: "..." }
    if (result.message) {
      const text = String(result.message).trim();
      if (text) return text;
    }

    // Format 6: Array response (n8n format)
    if (Array.isArray(result.data) && result.data.length > 0) {
      const first = result.data[0];
      if (first?.json?.output) return String(first.json.output).trim();
      if (first?.json?.text) return String(first.json.text).trim();
      if (first?.text) return String(first.text).trim();
    }

    // Format 7: Raw object, try to stringify
    if (result.data && typeof result.data === "object") {
      const str = JSON.stringify(result.data);
      if (str && str !== "{}") return str;
    }

    console.error("❌ determineAssistantReply: Could not extract text from result:", result);
    return "Gagal mendapatkan balasan dari AI. Format response tidak dikenali. Cek log browser console."
  }

  const handleSend = async () => {
    if ((!inputValue.trim() && attachedFiles.length === 0) || isLoading || uploadingFiles) return

    const trimmed = inputValue.trim()
    setInputValue("")
    setSessionError(null)

    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = await createSessionOnDemand(trimmed || "Chat dengan file")
      if (!sessionId) return
      await fetchSessions()
    }

    // Don't add file references to message content - files are shown as preview
    // Only include text message content
    // If only files are sent without text, use empty string (allowed by API)
    const messageContent = trimmed || ""

    // Save message first to get message_id
    const storedUserMessage = await persistMessage({
      sessionId,
      role: "user",
      content: messageContent,
      userId: user?.id || null,
    })

    if (!storedUserMessage) {
      setSessionError("Gagal menyimpan pesan. Coba lagi.")
      return
    }

    // Clear draft after successfully sending message
    if (typeof window !== "undefined") {
      const draftKey = sessionId 
        ? `chat-draft-${sessionId}` 
        : "chat-draft-new"
      localStorage.removeItem(draftKey)
    }

    // Prepare placeholder for assistant thinking (shown immediately)
    const placeholderId = `assistant-${Date.now()}`

    // Add user message and placeholder optimistically before uploads/n8n
    if (storedUserMessage) {
      recentlyPersistedMessages.current.add(storedUserMessage.id)
      // Clear tracking after 3 seconds (real-time should arrive by then)
      setTimeout(() => {
        recentlyPersistedMessages.current.delete(storedUserMessage.id)
      }, 3000)
      
      setMessages((prev) => {
        // Check if message already exists (from real-time or duplicate)
        const exists = prev.some((msg) => msg.id === storedUserMessage.id)
        if (exists) {
          // Update existing message with files
          return prev.map((msg) =>
            msg.id === storedUserMessage.id
              ? { ...msg, files: uploadedFiles }
              : msg
          )
        }
        // Add new message
        return [
          ...prev,
          { ...storedUserMessage, files: [] },
          {
            id: placeholderId,
            session_id: sessionId,
            role: "assistant" as const,
            content: "",
            created_at: new Date().toISOString(),
            isPlaceholder: true,
          },
        ]
      })
    }

    // Upload files after message is saved, so we can attach them to the message
    let uploadedFiles: ChatFile[] = []
    if (attachedFiles.length > 0) {
      try {
        uploadedFiles = await uploadFiles(sessionId, storedUserMessage.id)
        // Cleanup object URLs before clearing files
        attachedFiles.forEach((file, idx) => {
          if (file.type.startsWith("image/")) {
            const url = imageUrlsRef.current.get(idx)
            if (url) {
              URL.revokeObjectURL(url)
              imageUrlsRef.current.delete(idx)
            }
          }
        })
        setAttachedFiles([]) // Clear attached files after upload
      } catch (error) {
        console.error("Failed to upload files:", error)
        // Continue even if file upload fails - message is already saved
      }
    }

    // If uploads finished, update user message with files (placeholder stays)
    if (uploadedFiles.length > 0) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === storedUserMessage.id ? { ...msg, files: uploadedFiles } : msg
        )
      )
    }

    try {
      // Detect and persist user-declared name before sending to n8n
      if (user?.id && !isUpdatingProfile) {
        const nameMatch = trimmed.match(NAME_CAPTURE_REGEX)
        const declaredName = nameMatch?.[1]?.trim()
        const existingName =
          userProfile?.display_name ||
          user?.user_metadata?.full_name ||
          user?.email

        if (declaredName && declaredName !== existingName) {
          setIsUpdatingProfile(true)
          const updated = await persistUserName(user.id, declaredName)
          if (updated) {
            setUserProfile(updated)
          }
          setIsUpdatingProfile(false)
        }
      }

      console.log("📤 Sending message to N8N:", trimmed.substring(0, 100));
      
      // Prepare file data for N8N
      const fileData = uploadedFiles.map((f) => ({
        id: f.id || `file-${Date.now()}`,
        fileName: f.file_name,
        fileType: f.file_type,
        fileSize: f.file_size,
        url: f.storage_url, // Public URL from Supabase Storage
        metadata: f.metadata,
      }))
      
      // Log file data for debugging (only in development)
      if (process.env.NODE_ENV === "development" && fileData.length > 0) {
        console.log("📎 Files sent to N8N:", fileData.map(f => ({
          fileName: f.fileName,
          fileType: f.fileType,
          url: f.url?.substring(0, 100) + "...", // Truncate URL for logging
        })))
      }

      console.log("📎 Files to send to N8N:", fileData.length > 0 ? fileData : "No files")

      const userContext = buildUserContext(user, userProfile)

      const conversationHistory = buildHistoryPayload(
        messages,
        {
          ...storedUserMessage,
          files: uploadedFiles,
        },
        resolveUserContextMessage(userContext, FALLBACK_NAME_CONTEXT)
      )

      const result = await trigger({
        message: trimmed,
        sessionId,
        files: fileData.length > 0 ? fileData : undefined,
        history: conversationHistory,
        user: user
          ? { id: user.id, email: user.email, name: user.user_metadata?.full_name }
          : undefined,
        profile: userProfile
          ? {
              display_name: userProfile.display_name,
              tone: userProfile.tone,
              interests: userProfile.interests,
              lang: userProfile.lang,
            }
          : undefined,
      })
      console.log("📥 Received result from N8N:", JSON.stringify(result).substring(0, 300));
      
      let aiResponseText = determineAssistantReply(result)
      console.log("✅ Extracted AI response (raw):", aiResponseText.substring(0, 200));

      // Bersihkan markdown formatting
      aiResponseText = cleanMarkdown(aiResponseText)
      console.log("✅ Extracted AI response (cleaned):", aiResponseText.substring(0, 200));

      // Validasi response tidak kosong
      if (!aiResponseText || aiResponseText.trim() === "" || aiResponseText.includes("Gagal mendapatkan")) {
        throw new Error(`Invalid AI response: ${aiResponseText}`)
      }

      const storedAssistant = await persistMessage({
        sessionId,
        role: "assistant",
      content: aiResponseText,
      userId: null,
      })

      if (!storedAssistant) {
        console.warn("⚠️ Failed to persist assistant message, but continuing with display");
      } else {
        // Track this message to prevent duplicate from real-time
        recentlyPersistedMessages.current.add(storedAssistant.id)
        setTimeout(() => {
          recentlyPersistedMessages.current.delete(storedAssistant.id)
        }, 3000)
      }

      // Update placeholder dengan message yang tersimpan atau buat temporary
      // Real-time subscription akan handle update jika message sudah di-save
      const finalMessage = storedAssistant || {
        id: `temp-${Date.now()}`,
        session_id: sessionId,
        role: "assistant" as const,
        content: "",
        created_at: new Date().toISOString(),
        isPlaceholder: true,
      }

      // Update placeholder - check if real-time already added the message
      setMessages((prev) => {
        // Check if message already exists from real-time subscription
        const existingMessage = prev.find((msg) => msg.id === finalMessage.id)
        if (existingMessage && !existingMessage.isPlaceholder) {
          // Real-time already added it, just update content for typing effect
          return prev.map((msg) =>
            msg.id === finalMessage.id ? { ...msg, content: "" } : msg
          )
        }
        // Replace placeholder with final message
        return prev.map((msg) =>
          msg.id === placeholderId ? { ...finalMessage, content: "", isPlaceholder: true } : msg
        )
      })

      await typeWriterEffect(aiResponseText, (partial) => {
        setMessages((prev) => {
          // Find message by ID (could be finalMessage.id or placeholderId if not replaced yet)
          const messageToUpdate = prev.find(
            (msg) => msg.id === finalMessage.id || (msg.id === placeholderId && !prev.some((m) => m.id === finalMessage.id))
          )
          
          if (!messageToUpdate) return prev
          
          const targetId = messageToUpdate.id === placeholderId ? placeholderId : finalMessage.id
          
          return prev.map((msg) =>
            msg.id === targetId ? { ...msg, content: partial } : msg
          )
        })
      })

      // Mark thinking done after typing completes
      setMessages((prev) =>
        prev.map((msg) =>
          (msg.id === finalMessage.id || msg.id === placeholderId)
            ? { ...msg, content: aiResponseText, isPlaceholder: false }
            : msg
        )
      )
    } catch (error) {
      console.error("❌ handleSend error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error details:", errorMessage);
      
      setMessages((prev) => prev.filter((msg) => msg.id !== placeholderId))
      setSessionError(`Terjadi kesalahan: ${errorMessage.substring(0, 100)}`)
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          session_id: sessionId!,
          role: "assistant",
          content: `Maaf, permintaan gagal diproses. Error: ${errorMessage.substring(0, 150)}`,
          created_at: new Date().toISOString(),
        },
      ])
    }
  }

  const handleRegenerateResponse = useCallback(async (assistantMessageId: string) => {
    if (!activeSessionId || isLoading) return

    // Find the assistant message and the user message before it
    const messageIndex = messages.findIndex((msg) => msg.id === assistantMessageId)
    if (messageIndex === -1) return

    // Find the previous user message
    let userMessageIndex = -1
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        userMessageIndex = i
        break
      }
    }

    if (userMessageIndex === -1) {
      setSessionError("Tidak dapat menemukan pesan user sebelumnya.")
      return
    }

    const userMessage = messages[userMessageIndex]
    const userMessageContent = userMessage.content.replace(/\n\n\[File terlampir:.*?\]/g, "").trim()

    // Remove the assistant message and any messages after it (until next user message)
    const messagesToKeep = messages.slice(0, messageIndex)
    setMessages(messagesToKeep)

    // Re-send the user message
    const placeholderId = `assistant-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      {
        id: placeholderId,
        session_id: activeSessionId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        isPlaceholder: true,
      },
    ])

    try {
      const result = await trigger({
        message: userMessageContent,
        sessionId: activeSessionId,
        files: undefined, // Files are already in the message
        history: buildHistoryPayload(
          messagesToKeep,
          { ...userMessage, content: userMessageContent },
          resolveUserContextMessage(
            buildUserContext(user, userProfile),
            FALLBACK_NAME_CONTEXT
          )
        ),
        user: user
          ? { id: user.id, email: user.email, name: user.user_metadata?.full_name }
          : undefined,
        profile: userProfile
          ? {
              display_name: userProfile.display_name,
              tone: userProfile.tone,
              interests: userProfile.interests,
              lang: userProfile.lang,
            }
          : undefined,
      })

      let aiResponseText = determineAssistantReply(result)
      aiResponseText = cleanMarkdown(aiResponseText)

      if (!aiResponseText || aiResponseText.trim() === "" || aiResponseText.includes("Gagal mendapatkan")) {
        throw new Error(`Invalid AI response: ${aiResponseText}`)
      }

      const storedAssistant = await persistMessage({
        sessionId: activeSessionId,
        role: "assistant",
        content: aiResponseText,
        userId: null,
      })

      if (!storedAssistant) {
        console.warn("⚠️ Failed to persist assistant message, but continuing with display")
      } else {
        // Track to prevent duplicate from real-time subscription
        recentlyPersistedMessages.current.add(storedAssistant.id)
        setTimeout(() => {
          recentlyPersistedMessages.current.delete(storedAssistant.id)
        }, 5000)
      }

      const finalMessage = storedAssistant || {
        id: `temp-${Date.now()}`,
        session_id: activeSessionId,
        role: "assistant" as const,
        content: "",
        created_at: new Date().toISOString(),
        isPlaceholder: true,
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === placeholderId ? { ...finalMessage, content: "", isPlaceholder: true } : msg
        )
      )

      await typeWriterEffect(aiResponseText, (partial) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === finalMessage.id ? { ...msg, content: partial } : msg
          )
        )
      })

      // Mark thinking done after typing completes
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === finalMessage.id || msg.id === placeholderId
            ? { ...msg, content: aiResponseText, isPlaceholder: false }
            : msg
        )
      )
    } catch (error) {
      console.error("Regenerate error:", error)
      setMessages((prev) => prev.filter((msg) => msg.id !== placeholderId))
      setSessionError("Gagal meregenerate respons. Coba lagi.")
      // Clear flag immediately on error
      isAutoRegenerating.current = false
    } finally {
      // Always clear the flag when regenerate completes (success or error)
      // This prevents the flag from getting stuck if there's an error
      // But use a delay to prevent immediate re-trigger
      setTimeout(() => {
        isAutoRegenerating.current = false
        console.log("✅ Regenerate flag cleared in handleRegenerateResponse")
      }, 2000) // Increased to 2 seconds
    }
  }, [activeSessionId, messages, isLoading, trigger, persistMessage])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate file size (max 10MB per file)
    const maxSize = 10 * 1024 * 1024
    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        setSessionError(`File ${file.name} terlalu besar (max 10MB)`)
        return false
      }
      return true
    })

    setAttachedFiles((prev) => [...prev, ...validFiles])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async (sessionId: string, messageId: string | null): Promise<ChatFile[]> => {
    if (attachedFiles.length === 0) return []

    if (!user?.id) {
      setSessionError("Anda harus login untuk mengupload file.")
      throw new Error("User not authenticated")
    }

    setUploadingFiles(true)
    const uploadedFiles: ChatFile[] = []

    try {
      for (const file of attachedFiles) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("sessionId", sessionId)
        formData.append("userId", user.id)
        if (messageId) formData.append("messageId", messageId)

        const response = await fetch("/api/chat/files/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to upload file")
        }

        const data = await response.json()
        if (data.file) {
          uploadedFiles.push(data.file)
        }
      }
    } catch (error) {
      console.error("File upload error:", error)
      setSessionError("Gagal mengupload file. Coba lagi.")
      throw error
    } finally {
      setUploadingFiles(false)
    }

    return uploadedFiles
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startRenameSession = (session: ChatSession) => {
    setEditingSessionId(session.id)
    setEditingTitle(session.title ?? "Untitled chat")
    setSessionError(null)
  }

  const cancelRenameSession = () => {
    setEditingSessionId(null)
    setEditingTitle("")
  }

  const handleRenameSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!editingSessionId) return

    const trimmed = editingTitle.trim()
    if (!trimmed) {
      setSessionError("Nama sesi tidak boleh kosong.")
      return
    }

    const previousSessions = sessions
    setSessionActionLoading(editingSessionId)
    setSessions((prev) =>
      prev.map((session) =>
        session.id === editingSessionId ? { ...session, title: trimmed } : session
      )
    )

    if (!user?.id) {
      setSessionError("Anda harus login untuk rename sesi.")
      setSessions(previousSessions)
      setSessionActionLoading(null)
      return
    }

    try {
      const response = await fetch(`/api/chat/sessions/${editingSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed, userId: user.id }),
      })

      if (!response.ok) {
        if (response.status === 403) {
          setSessionError("Anda tidak memiliki akses ke sesi ini.")
        } else {
          throw new Error("Failed to rename session")
        }
      }
      cancelRenameSession()
    } catch (error) {
      console.error("handleRenameSubmit error:", error)
      setSessions(previousSessions)
      setSessionError("Rename gagal. Coba lagi.")
    } finally {
      setSessionActionLoading(null)
    }
  }

  const handleExportChat = useCallback(async () => {
    if (!activeSessionId) {
      setSessionError("Tidak ada session aktif untuk di-export.")
      return
    }

    if (messages.length === 0) {
      setSessionError("Tidak ada pesan untuk di-export.")
      return
    }

    // Try to find session in current sessions array
    let session = sessions.find((s) => s.id === activeSessionId)
    
    // If not found, try to fetch it from API (for newly created sessions)
    if (!session) {
      try {
        if (!user?.id) {
          setSessionError("Anda harus login untuk mengekspor chat.")
          return
        }
        
        const response = await fetch(`/api/chat/sessions?userId=${user.id}`)
        if (response.ok) {
          const updatedSessions = await response.json()
          session = updatedSessions.find((s: ChatSession) => s.id === activeSessionId)
          // Update sessions state if found
          if (session) {
            setSessions((prev) => {
              const exists = prev.find((s) => s.id === session!.id)
              if (!exists) {
                return [session!, ...prev]
              }
              return prev
            })
          }
        }
      } catch (error) {
        console.error("❌ Failed to fetch session for export:", error)
      }
    }

    // If still not found, create a minimal session object from current data
    if (!session) {
      // Use first message's session_id and created_at to create minimal session
      const firstMessage = messages[0]
      if (firstMessage) {
        // Find first user message for title
        const firstUserMessage = messages.find(m => m.role === "user")
        const title = firstUserMessage?.content?.substring(0, 50).trim() || "Untitled Chat"
        
        session = {
          id: activeSessionId,
          title: title,
          user_id: user?.id || null,
          created_at: firstMessage.created_at,
          updated_at: new Date().toISOString(),
        } as ChatSession
        
        console.log("📝 Created minimal session for export:", session)
      } else {
        setSessionError("Session tidak ditemukan untuk export.")
        return
      }
    }

    try {
      // Export sebagai text
      const exportText = exportChatAsText(session, messages, {
        includeTimestamps: true,
        includeFiles: true,
        format: "text",
      })

      // Generate filename
      const sessionTitle = session.title || "Untitled Chat"
      const sanitizedTitle = sessionTitle
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()
        .substring(0, 50)
      const dateStr = new Date().toISOString().split("T")[0]
      const filename = `aura-chat-${sanitizedTitle}-${dateStr}.txt`

      // Download
      downloadTextFile(exportText, filename)
    } catch (error) {
      console.error("❌ Export error:", error)
      setSessionError("Gagal mengekspor chat. Coba lagi.")
    }
  }, [activeSessionId, sessions, messages, user?.id])

  const handleDeleteSession = async (sessionId: string) => {
    const previousSessions = sessions
    const remaining = previousSessions.filter((session) => session.id !== sessionId)
    const fallbackSessionId = remaining[0]?.id ?? null

    setSessionActionLoading(sessionId)
    setSessions(remaining)

    const wasActive = sessionId === activeSessionId
    if (wasActive) {
      setActiveSessionId(null)
      setMessages([])
    }

    if (!user?.id) {
      setSessionError("Anda harus login untuk menghapus sesi.")
      setSessions(previousSessions)
      setSessionActionLoading(null)
      return
    }

    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}?userId=${user.id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete session")

      if (wasActive) {
        if (fallbackSessionId) {
          await loadSession(fallbackSessionId)
        } else {
          handleNewChat()
        }
      }
    } catch (error) {
      console.error("handleDeleteSession error:", error)
      setSessions(previousSessions)
      setSessionError("Gagal menghapus sesi. Coba lagi.")
    } finally {
      setSessionActionLoading(null)
      setPendingDeleteSessionId(null)
    }
  }

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error("Failed to copy message:", error)
    }
  }

  const handleStartEditMessage = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId)
    setEditingMessageContent(currentContent)
  }

  const handleCancelEditMessage = () => {
    setEditingMessageId(null)
    setEditingMessageContent("")
  }

  const handleSaveEditMessage = async (messageId: string) => {
    if (!activeSessionId || !user?.id) {
      setSessionError("Anda harus login untuk mengedit pesan.")
      return
    }

    const trimmedContent = editingMessageContent.trim()
    if (!trimmedContent) {
      setSessionError("Pesan tidak boleh kosong.")
      return
    }

    setIsUpdatingMessage(true)
    try {
      const response = await fetch(
        `/api/chat/sessions/${activeSessionId}/messages/${messageId}?userId=${user.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmedContent }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update message")
      }

      const { message: updatedMessage } = await response.json()

      console.log("✅ Message updated in database:", {
        messageId,
        oldContent: messages.find(m => m.id === messageId)?.content,
        newContent: updatedMessage.content
      })

      // Update state immediately with the updated message - create new object to force re-render
      // Use a completely new array reference to ensure React detects the change
      const newTimestamp = Date.now()
      setMessages((prev) => {
        const updated = prev.map((msg) => {
          if (msg.id === messageId) {
            // Create completely new object with all properties to ensure React detects the change
            return {
              ...msg,
              content: updatedMessage.content,
              // Add a timestamp to force re-render
              _updatedAt: newTimestamp,
            }
          }
          return msg
        })
        console.log("📝 Updated messages state:", {
          messageId,
          found: updated.find(m => m.id === messageId),
          content: updated.find(m => m.id === messageId)?.content,
          timestamp: newTimestamp,
          allMessages: updated.length
        })
        // Return new array reference
        return [...updated]
      })

      // Clear editing state IMMEDIATELY after state update
      setEditingMessageId(null)
      setEditingMessageContent("")

      // Force a re-render by updating state again with a new array reference
      // Use requestAnimationFrame + setTimeout for reliable re-render
      requestAnimationFrame(() => {
        setMessages((prev) => {
          // Always create new array and update the message with new timestamp
          return prev.map((msg) => {
            if (msg.id === messageId) {
              // Create completely new object to force React to re-render
              return {
                ...msg,
                content: updatedMessage.content, // Ensure content is correct
                _updatedAt: Date.now(), // Force new timestamp
              }
            }
            return msg
          })
        })
        
        // Double-check after a small delay
        setTimeout(() => {
          setMessages((prev) => {
            const message = prev.find(m => m.id === messageId)
            if (message && message.content !== updatedMessage.content) {
              // Content doesn't match - force update again
              console.warn("⚠️ Message content mismatch, forcing update again")
              return prev.map((msg) => {
                if (msg.id === messageId) {
                  return {
                    ...msg,
                    content: updatedMessage.content,
                    _updatedAt: Date.now(),
                  }
                }
                return msg
              })
            }
            // Content is correct, ensure new array reference
            return prev.map((msg) => (msg.id === messageId ? { ...msg } : msg))
          })
        }, 100)
      })

      // Auto-regenerate AI response after editing user message
      // IMPORTANT: Use updatedMessage.content (the NEW edited content), not messages state
      // Wait for state to be updated first, then trigger regenerate
      setTimeout(() => {
        setMessages((currentMessages) => {
          // Find the edited message in current state
          const messageIndex = currentMessages.findIndex((msg) => msg.id === messageId)
          if (messageIndex === -1) return currentMessages

          // Find the next assistant message after this user message
          let assistantMessageIndex = -1
          for (let i = messageIndex + 1; i < currentMessages.length; i++) {
            if (currentMessages[i].role === "assistant") {
              assistantMessageIndex = i
              break
            }
            // Stop if we hit another user message
            if (currentMessages[i].role === "user") {
              break
            }
          }

          // If assistant message found, regenerate it (only once)
          if (assistantMessageIndex !== -1 && !isAutoRegenerating.current) {
            const assistantMessageId = currentMessages[assistantMessageIndex].id
            
            // Set flag immediately to prevent multiple calls
            isAutoRegenerating.current = true
            console.log("🔒 Auto-regenerate flag set to true for:", assistantMessageId)
            console.log("📝 Using edited content for regenerate:", updatedMessage.content)
            
            // Track this message ID to prevent duplicate from real-time
            recentlyPersistedMessages.current.add(assistantMessageId)
            setTimeout(() => {
              recentlyPersistedMessages.current.delete(assistantMessageId)
            }, 10000)

            // Trigger regenerate with the EDITED content
            // Use updatedMessage.content directly, not from messages state
            setTimeout(async () => {
              // Double-check flag before regenerating
              if (!isAutoRegenerating.current) {
                console.log("⚠️ Auto-regenerate flag was cleared, skipping")
                return
              }
              
              console.log("🔄 Auto-regenerating response with edited content:", updatedMessage.content)
              
              // Remove the assistant message first
              setMessages((prev) => prev.slice(0, assistantMessageIndex))
              
              // Create placeholder
              const placeholderId = `assistant-${Date.now()}`
              setMessages((prev) => [
                ...prev,
                {
                  id: placeholderId,
                  session_id: activeSessionId!,
                  role: "assistant",
                  content: "",
                  created_at: new Date().toISOString(),
                  isPlaceholder: true,
                },
              ])

              try {
                // Use the EDITED content, not from messages state
                const editedContent = updatedMessage.content.replace(/\n\n\[File terlampir:.*?\]/g, "").trim()
                
                const result = await trigger({
                  message: editedContent,
                  sessionId: activeSessionId!,
                  files: undefined,
                })

                let aiResponseText = determineAssistantReply(result)
                aiResponseText = cleanMarkdown(aiResponseText)

                if (!aiResponseText || aiResponseText.trim() === "" || aiResponseText.includes("Gagal mendapatkan")) {
                  throw new Error(`Invalid AI response: ${aiResponseText}`)
                }

                const storedAssistant = await persistMessage({
                  sessionId: activeSessionId!,
                  role: "assistant",
                  content: aiResponseText,
                })

                if (!storedAssistant) {
                  console.warn("⚠️ Failed to persist assistant message, but continuing with display")
                } else {
                  recentlyPersistedMessages.current.add(storedAssistant.id)
                  setTimeout(() => {
                    recentlyPersistedMessages.current.delete(storedAssistant.id)
                  }, 5000)
                }

                const finalMessage = storedAssistant || {
                  id: `temp-${Date.now()}`,
                  session_id: activeSessionId!,
                  role: "assistant" as const,
                  content: "",
                  created_at: new Date().toISOString(),
                }

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === placeholderId ? { ...finalMessage, content: "" } : msg
                  )
                )

                await typeWriterEffect(aiResponseText, (partial) => {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === finalMessage.id ? { ...msg, content: partial } : msg
                    )
                  )
                })
              } catch (error) {
                console.error("❌ Auto-regenerate error:", error)
                setMessages((prev) => prev.filter((msg) => msg.id !== placeholderId))
                setSessionError("Gagal meregenerate respons. Coba lagi.")
              } finally {
                // Clear flag after completion
                setTimeout(() => {
                  isAutoRegenerating.current = false
                  console.log("✅ Auto-regenerate flag cleared")
                }, 2000)
              }
            }, 1500) // Delay to ensure state is fully updated
          } else if (assistantMessageIndex !== -1) {
            console.log("⏭️ Auto-regenerate skipped - already in progress")
          }
          
          return currentMessages
        })
      }, 200) // Wait 200ms for state to be updated
    } catch (error) {
      console.error("handleSaveEditMessage error:", error)
      const errorMessage = error instanceof Error ? error.message : "Gagal mengupdate pesan."
      setSessionError(errorMessage)
    } finally {
      setIsUpdatingMessage(false)
    }
  }

  const TypingIndicator = () => (
    <div className={cn("flex items-center gap-1 text-muted-foreground")}>
      <span className={cn("block h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.2s]")}></span>
      <span className={cn("block h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.1s]")}></span>
      <span className={cn("block h-2 w-2 rounded-full bg-primary animate-bounce")}></span>
      <span className="text-xs text-muted-foreground ml-2">IMUII sedang berpikir...</span>
    </div>
  )

  const renderMessageBubble = (message: UILocalMessage) => {
    const isUser = message.role === "user"
    const files = message.files || []
    const isCopied = copiedMessageId === message.id
    const isEditing = editingMessageId === message.id && isUser

    return (
      <div
        className={cn("flex flex-col gap-2 group", isUser ? "items-end" : "items-start")}
        style={isEditing ? { direction: "ltr" } : undefined}
        dir={isEditing ? "ltr" : undefined}
      >
        {/* File attachments */}
        {files.length > 0 && (
          <div className={cn("flex flex-wrap gap-2", "max-w-full sm:max-w-[72%]")}>
            {files.map((file) => {
              const isImage = file.file_type.startsWith("image/")
              const imageUrl = file.storage_url

              // Render image preview
              if (isImage && imageUrl) {
                return (
                  <div
                    key={file.id}
                    className={cn(
                      "relative rounded-lg overflow-hidden border",
                      isUser
                        ? "border-primary/30 bg-primary/10"
                        : "border-border bg-muted"
                    )}
                  >
                    <a
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn("block w-full")}
                    >
                      <img
                        src={imageUrl}
                        alt={file.file_name}
                        className={cn(
                          "w-full h-auto",
                          "max-h-[400px] sm:max-h-[500px] object-contain",
                          "hover:opacity-90 transition-opacity cursor-pointer"
                        )}
                        loading="lazy"
                        onError={(e) => {
                          // Fallback jika gambar gagal load
                          console.error("Failed to load image:", imageUrl)
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    </a>
                  </div>
                )
              }

              // Render non-image files as before
              return (
                <a
                  key={file.id}
                  href={file.storage_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition",
                    isUser
                      ? "bg-primary/20 text-foreground border-primary/30 hover:bg-primary/30"
                      : "bg-card text-foreground border-border hover:bg-muted"
                  )}
                >
                  <File className="h-4 w-4" />
                  <span className="truncate max-w-[200px]">{file.file_name}</span>
                </a>
              )
            })}
          </div>
        )}

        {/* Message content */}
        {(message.content || message.isPlaceholder) && (
          <div
            className={cn(
              "relative max-w-[72%] rounded-2xl px-4 py-2.5",
              "transition-all duration-200",
              isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              isEditing && "edit-mode-container"
            )}
            style={isEditing ? { direction: "ltr", textAlign: "left" } : undefined}
            dir={isEditing ? "ltr" : undefined}
          >
            {isEditing ? (
              /* Edit mode - Completely isolated from parent styling */
              <div 
                className={cn("flex flex-col gap-2", "edit-mode-wrapper")} 
                dir="ltr" 
                style={{ 
                  direction: "ltr", 
                  textAlign: "left",
                  unicodeBidi: "embed",
                  isolation: "isolate" as any
                }}
              >
                <textarea
                  value={editingMessageContent}
                  onChange={(e) => {
                    const newValue = e.target.value
                    setEditingMessageContent(newValue)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleSaveEditMessage(message.id)
                    } else if (e.key === "Escape") {
                      e.preventDefault()
                      handleCancelEditMessage()
                    }
                  }}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-sm",
                    "bg-card text-foreground border border-border",
                    "focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent",
                    "resize-none min-h-[60px]",
                    "edit-textarea"
                  )}
                  dir="ltr"
                  style={{ 
                    direction: "ltr",
                    textAlign: "left",
                    unicodeBidi: "embed",
                    writingMode: "horizontal-tb",
                    transform: "none"
                  }}
                  autoFocus
                  disabled={isUpdatingMessage}
                />
                <div className={cn("flex items-center gap-2 justify-end")}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEditMessage}
                    disabled={isUpdatingMessage}
                    className={cn("h-7 px-3 text-xs")}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => handleSaveEditMessage(message.id)}
                    disabled={isUpdatingMessage || !editingMessageContent.trim()}
                    className={cn("h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground")}
                  >
                    {isUpdatingMessage ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* View mode */
              <>
                <p className={cn("text-sm leading-relaxed whitespace-pre-wrap")}>
                  {message.isPlaceholder && !message.content
                    ? ""
                    : message.content
                    ? message.content.replace(/\n\n\[File terlampir:.*?\]/g, "").trim() || ""
                    : ""}
                </p>
                {message.isPlaceholder && <TypingIndicator />}
                {/* Action buttons - show on hover */}
                {!message.isPlaceholder && (
                  <div className={cn(
                    "absolute -bottom-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
                    isUser ? "-left-20" : "-right-28"
                  )}>
                    {/* Edit button - only for user messages */}
                    {isUser && (
                      <button
                        type="button"
                        onClick={() => handleStartEditMessage(message.id, message.content)}
                        className={cn(
                          "p-1.5 rounded-full bg-card hover:bg-muted shadow-md",
                          "border border-border"
                        )}
                        aria-label="Edit message"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                    {/* Copy button */}
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(message.content, message.id)}
                      className={cn(
                        "p-1.5 rounded-full bg-white/90 hover:bg-white shadow-md",
                        "border border-gray-200"
                      )}
                      aria-label="Copy message"
                    >
                      {isCopied ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                    {/* Regenerate button - only for assistant messages */}
                    {!isUser && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRegenerateResponse(message.id)}
                          disabled={isLoading}
                          className={cn(
                            "p-1.5 rounded-full bg-card hover:bg-muted shadow-md",
                            "border border-border",
                            isLoading && "opacity-50 cursor-not-allowed"
                          )}
                          aria-label="Regenerate response"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                        {/* Feedback buttons */}
                        <button
                          type="button"
                          onClick={() => setFeedbackGiven((p) => ({ ...p, [message.id]: "up" }))}
                          className={cn(
                            "p-1.5 rounded-full bg-card hover:bg-muted shadow-md border border-border",
                            feedbackGiven[message.id] === "up" && "bg-green-100 dark:bg-green-900/30"
                          )}
                          aria-label="Jawaban membantu"
                        >
                          <ThumbsUp className={cn("h-3.5 w-3.5", feedbackGiven[message.id] === "up" ? "text-green-600" : "text-muted-foreground")} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeedbackGiven((p) => ({ ...p, [message.id]: "down" }))}
                          className={cn(
                            "p-1.5 rounded-full bg-card hover:bg-muted shadow-md border border-border",
                            feedbackGiven[message.id] === "down" && "bg-red-100 dark:bg-red-900/30"
                          )}
                          aria-label="Jawaban kurang membantu"
                        >
                          <ThumbsDown className={cn("h-3.5 w-3.5", feedbackGiven[message.id] === "down" ? "text-red-600" : "text-muted-foreground")} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Timestamp */}
        {message.created_at && !message.isPlaceholder && (
          <span
            className={cn(
              "text-xs text-muted-foreground px-2",
              isUser ? "text-right" : "text-left"
            )}
          >
            {formatRelativeTime(message.created_at)}
          </span>
        )}
      </div>
    )
  }

  const formatSessionTitle = (session: ChatSession) => {
    if (session.title) return session.title
    return "Untitled chat"
  }

  const handleRealtimeInsert = useCallback(
    (message: ChatMessage) => {
      if (!message || message.session_id !== activeSessionId) return
      
      // Skip if this message was recently persisted (already in state)
      if (recentlyPersistedMessages.current.has(message.id)) {
        console.log("⏭️ Skipping real-time insert for recently persisted message:", message.id)
        return
      }
      
      setMessages((prev) => {
        // More robust deduplication - check by ID first
        const existingIndex = prev.findIndex((item) => item.id === message.id)
        
        if (existingIndex >= 0) {
          // Message already exists - update it instead of adding duplicate
          // This handles case where optimistic update was added first
          const updated = [...prev]
          updated[existingIndex] = {
            ...message,
            // Preserve files if they exist
            files: prev[existingIndex].files || undefined,
          }
          return updated
        }
        
        // Check for placeholder messages that should be replaced
        const placeholderIndex = prev.findIndex(
          (item) =>
            item.isPlaceholder &&
            item.role === message.role &&
            item.session_id === message.session_id
        )
        
        if (placeholderIndex >= 0 && message.role === "assistant") {
          // Replace placeholder with real message
          const updated = [...prev]
          updated[placeholderIndex] = message
          return updated
        }
        
        // Additional check: prevent duplicate by content + session + role (for race conditions)
        // More aggressive deduplication - check within 30 seconds
        const duplicateByContent = prev.find(
          (item) =>
            item.content === message.content &&
            item.session_id === message.session_id &&
            item.role === message.role &&
            item.id !== message.id && // Different ID but same content
            Math.abs(new Date(item.created_at || 0).getTime() - new Date(message.created_at || 0).getTime()) < 30000 // Within 30 seconds
        )
        
        if (duplicateByContent) {
          console.log("⏭️ Skipping duplicate message by content:", message.id, "Duplicate ID:", duplicateByContent.id)
          return prev
        }

        // Additional check: prevent duplicate assistant messages that are very similar
        // This catches cases where auto-regenerate creates multiple similar responses
        if (message.role === "assistant") {
          // Check all assistant messages in the session, not just recent ones
          const sessionAssistants = prev.filter(
            (item) =>
              item.role === "assistant" &&
              item.session_id === message.session_id
          )
          
          // Check if there's a very similar message (first 150 chars match exactly)
          const similarMessage = sessionAssistants.find((item) => {
            if (item.id === message.id) return false // Skip self
            const itemStart = item.content.substring(0, Math.min(150, item.content.length)).trim()
            const messageStart = message.content.substring(0, Math.min(150, message.content.length)).trim()
            return itemStart.length > 50 && messageStart.length > 50 && itemStart === messageStart
          })
          
          if (similarMessage) {
            console.log("⏭️ Skipping similar assistant message:", message.id, "Similar ID:", similarMessage.id)
            return prev
          }

          // Check for multiple assistant messages with very close timestamps (within 5 seconds)
          // This catches auto-regenerate duplicates
          const recentAssistants = sessionAssistants.filter(
            (item) =>
              Math.abs(new Date(item.created_at || 0).getTime() - new Date(message.created_at || 0).getTime()) < 5000 // Within 5 seconds
          )
          
          if (recentAssistants.length > 0) {
            console.log("⏭️ Skipping assistant message - too many recent assistants:", message.id, "Recent count:", recentAssistants.length)
            return prev
          }
        }
        
        // New message - add it
        console.log("➕ Adding new message from real-time:", message.id, message.role)
        return [...prev, message]
      })
    },
    [activeSessionId]
  )

  useChatRealtime(activeSessionId, handleRealtimeInsert)

  return (
    <div className={cn("relative grid gap-6 lg:grid-cols-[280px_1fr]")}>
      {/* Mobile overlay backdrop */}
      {isSessionListOpen && (
        <div
          className={cn(
            "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity",
            isSessionListOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setIsSessionListOpen(false)}
        />
      )}

      {/* Session List Sidebar */}
      <aside
        className={cn(
          "bg-card border border-border rounded-lg shadow-sm flex flex-col",
          "fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-[280px]",
          "transform transition-transform duration-300 ease-in-out",
          isSessionListOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "h-[calc(100vh-200px)] lg:h-[620px]"
        )}
      >
        <div className={cn("p-4 border-b border-border space-y-3")}>
          <div className={cn("flex items-center gap-2")}>
            <Button
              className={cn(
                "flex-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
                "min-h-[44px] touch-manipulation"
              )}
              onClick={() => {
                handleNewChat()
                setIsSessionListOpen(false)
              }}
              disabled={isLoading || isCreatingSession}
            >
              {isCreatingSession ? "Menyiapkan..." : "New Chat"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={refreshSessions}
              disabled={isRefreshingSessions}
              aria-label="Refresh sessions"
              className={cn("min-h-[44px] min-w-[44px] touch-manipulation")}
            >
              {isRefreshingSessions ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          {/* Search bar */}
          <div className={cn("relative")}>
            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground")} />
            <Input
              type="text"
              placeholder="Cari sesi chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-9 pr-3 h-9 text-sm border-input bg-background focus:border-primary focus:ring-primary",
                "min-h-[36px]"
              )}
            />
          </div>
        </div>

        <div className={cn("flex-1 overflow-y-auto p-3 space-y-2")}>
          {isLoadingSessions ? (
            // Skeleton loaders for sessions
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className={cn("rounded-lg border border-border bg-card p-3 space-y-2")}
              >
                <Skeleton className={cn("h-4 w-3/4")} />
                <Skeleton className={cn("h-3 w-1/2")} />
              </div>
            ))
          ) : sessions.length === 0 ? (
            <div className={cn("px-2 py-8 text-center space-y-2")}>
              <MessageSquare className={cn("h-8 w-8 text-muted-foreground mx-auto")} />
              <p className={cn("text-xs text-muted-foreground font-medium")}>
                Belum ada riwayat chat
              </p>
              <p className={cn("text-xs text-muted-foreground/80")}>
                Klik "New Chat" untuk memulai percakapan
              </p>
            </div>
          ) : sessions.filter((session) => {
              // Apply same filters as in the map function
              if (!user?.id || !session.user_id || session.user_id !== user.id) {
                return false
              }
              if (searchQuery.trim()) {
                const title = formatSessionTitle(session).toLowerCase()
                const query = searchQuery.toLowerCase().trim()
                if (!title.includes(query)) {
                  return false
                }
              }
              return true
            }).length === 0 ? (
            <div className={cn("px-2 py-8 text-center space-y-2")}>
              <Search className={cn("h-8 w-8 text-muted-foreground mx-auto")} />
              <p className={cn("text-xs text-muted-foreground font-medium")}>
                Tidak ada sesi yang cocok
              </p>
              <p className={cn("text-xs text-muted-foreground/80")}>
                {searchQuery.trim()
                  ? `Tidak ada sesi dengan judul "${searchQuery}"`
                  : "Belum ada riwayat. Mulai percakapan baru."}
              </p>
            </div>
          ) : (
            sessions
              .filter((session) => {
                // Strict filter: only show sessions that belong to current user
                if (!user?.id) {
                  console.warn("No user ID, filtering out session:", session.id)
                  return false
                }
                if (!session.user_id) {
                  console.warn("Session has no user_id, filtering out:", session.id)
                  return false
                }
                if (session.user_id !== user.id) {
                  console.warn("Session user_id mismatch, filtering out:", {
                    sessionId: session.id,
                    sessionUserId: session.user_id,
                    currentUserId: user.id,
                  })
                  return false
                }
                // Search filter: filter by session title
                if (searchQuery.trim()) {
                  const title = formatSessionTitle(session).toLowerCase()
                  const query = searchQuery.toLowerCase().trim()
                  if (!title.includes(query)) {
                    return false
                  }
                }
                return true
              })
              .map((session) => {
              const isActive = session.id === activeSessionId
              const isEditing = session.id === editingSessionId
              return (
                <div
                  key={session.id}
                  className={cn(
                    "rounded-lg border transition bg-card",
                    isActive
                      ? "border-primary shadow-sm"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {isEditing ? (
                    <form
                      onSubmit={handleRenameSubmit}
                      className={cn("p-3 space-y-2")}
                    >
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        autoFocus
                        placeholder="Nama sesi"
                      />
                      <div className={cn("flex items-center gap-2")}>
                        <Button
                          type="submit"
                          size="icon"
                          className={cn(
                            "bg-primary text-primary-foreground hover:bg-primary/90",
                            "min-h-[44px] min-w-[44px] touch-manipulation"
                          )}
                          disabled={sessionActionLoading === session.id}
                        >
                          {sessionActionLoading === session.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={cancelRenameSession}
                          className={cn("min-h-[44px] min-w-[44px] touch-manipulation")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className={cn("flex items-center gap-2 p-3")}>
                      <button
                        type="button"
                        onClick={() => {
                          loadSession(session.id)
                          // Close session list on mobile after selecting
                          setIsSessionListOpen(false)
                        }}
                        className={cn(
                          "flex-1 text-left min-h-[44px] touch-manipulation",
                          isActive ? "text-foreground font-medium" : "text-muted-foreground"
                        )}
                      >
                        <p className={cn("text-sm font-medium line-clamp-2")}>
                          {formatSessionTitle(session)}
                        </p>
                        {session.created_at && (
                          <span className={cn("text-xs text-muted-foreground")}>
                            {new Date(session.created_at).toLocaleString()}
                          </span>
                        )}
                      </button>
                      <div
                        className={cn(
                          "flex items-center gap-1 text-muted-foreground"
                        )}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => startRenameSession(session)}
                          aria-label="Rename chat"
                          className={cn("min-h-[44px] min-w-[44px] touch-manipulation")}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingDeleteSessionId(session.id)}
                          aria-label="Delete chat"
                          disabled={sessionActionLoading === session.id}
                          className={cn("min-h-[44px] min-w-[44px] touch-manipulation")}
                        >
                          {sessionActionLoading === session.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </aside>

      <div
        className={cn(
          "flex flex-col bg-card border border-border rounded-lg shadow-sm",
          "h-[calc(100vh-200px)] lg:h-[620px]"
        )}
      >
        {/* Mobile header with menu button */}
        <div className={cn("lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border")}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsSessionListOpen(true)}
            className={cn("min-h-[44px] min-w-[44px] touch-manipulation")}
            aria-label="Open sessions"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className={cn("flex items-center gap-2 flex-1")}>
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className={cn("text-sm font-semibold text-foreground")}>
              {activeSessionId
                ? sessions.find((s) => s.id === activeSessionId)?.title || "Chat"
                : "New Chat"}
            </h2>
          </div>
          {activeSessionId && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleExportChat}
              disabled={messages.length === 0}
              className={cn("min-h-[44px] min-w-[44px] touch-manipulation")}
              aria-label="Export chat"
              title={messages.length > 0 ? "Export chat history" : "Tidak ada pesan untuk di-export"}
            >
              <Download className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Desktop header with export button */}
        {activeSessionId && (
          <div className={cn("hidden lg:flex items-center justify-between px-6 py-3 border-b border-border")}>
            <div className={cn("flex items-center gap-2")}>
              <MessageSquare className="h-5 w-5 text-gray-600" />
              <h2 className={cn("text-sm font-semibold text-gray-900")}>
                {sessions.find((s) => s.id === activeSessionId)?.title || "Chat"}
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleExportChat}
              disabled={messages.length === 0}
              className={cn("min-h-[36px] gap-2")}
              aria-label="Export chat"
              title={messages.length > 0 ? "Export chat history" : "Tidak ada pesan untuk di-export"}
            >
              <Download className="h-4 w-4" />
              <span className={cn("text-sm")}>Export</span>
            </Button>
          </div>
        )}

        {sessionError && (
          <div
            className={cn(
              "px-6 py-3 border-b border-red-900/50 bg-red-950/50 text-sm text-red-400 flex items-center justify-between gap-4"
            )}
          >
            <span>{sessionError}</span>
            <button
              type="button"
              className={cn("text-xs underline")}
              onClick={() => setSessionError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        <div className={cn("flex-1 overflow-y-auto px-6 py-8 space-y-4 relative")}>
          {historyLoading ? (
            // Skeleton loaders for messages
            <div className={cn("space-y-4")}>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`message-skeleton-${index}`}
                  className={cn(
                    "flex flex-col gap-2",
                    index % 2 === 0 ? "items-end" : "items-start"
                  )}
                >
                  <Skeleton
                    className={cn(
                      "rounded-2xl",
                      index % 2 === 0 ? "w-1/2 h-16" : "w-2/3 h-20"
                    )}
                  />
                  <Skeleton className={cn("h-3 w-16", index % 2 === 0 ? "ml-auto" : "")} />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
              <div
                className={cn(
                "flex flex-col items-center justify-center h-full text-center px-6 space-y-4"
                )}
              >
              <div className={cn("space-y-3 max-w-md")}>
                <div className={cn("flex items-center justify-center")}>
                  <div className={cn(
                    "w-16 h-16 rounded-full bg-muted flex items-center justify-center"
                  )}>
                    <MessageSquare className={cn("h-8 w-8 text-primary")} />
                  </div>
                </div>
                <h3 className={cn("text-lg font-semibold text-foreground")}>
                  Selamat Datang di IMUII!
                </h3>
                <p className={cn("text-muted-foreground text-sm leading-relaxed")}>
                  Saya IMUII, asisten virtual resmi Universitas Islam Indonesia. 
                  Siap bantu pertanyaan kampus, layanan, dan informasi UII lainnya.
                </p>
                <p className={cn("text-muted-foreground text-xs mt-4")}>
                  Mulai percakapan baru atau pilih riwayat di samping untuk melihat chat sebelumnya.
                </p>
                <div className={cn("flex flex-wrap gap-2 justify-center mt-4")}>
                  {["Apa prodi di FTI?", "Kapan pendaftaran dibuka?", "Bagaimana cara daftar beasiswa?", "Fasilitas apa saja di UII?"].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setInputValue(q)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50",
                        "hover:bg-muted hover:border-primary/30 transition-colors"
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={`${message.id}-${message.content.substring(0, 20)}-${(message as any)._updatedAt || Date.now()}`}>
                {renderMessageBubble(message)}
              </div>
            ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={cn("border-t border-border bg-card px-6 py-4")}>
          {/* Attached files preview */}
          {attachedFiles.length > 0 && (
            <div className={cn("mb-3 flex flex-wrap gap-2")}>
              {attachedFiles.map((file, index) => {
                const isImage = file.type.startsWith("image/")
                // Get or create object URL for image files
                if (isImage && !imageUrlsRef.current.has(index)) {
                  imageUrlsRef.current.set(index, URL.createObjectURL(file))
                }
                const imageUrl = isImage ? imageUrlsRef.current.get(index) || null : null

                // Show image preview for image files
                if (isImage && imageUrl) {
                  return (
                    <div
                      key={index}
                      className={cn(
                        "relative rounded-lg overflow-hidden border border-border bg-muted"
                      )}
                    >
                      <img
                        src={imageUrl}
                        alt={file.name}
                        className={cn(
                          "max-h-[200px] max-w-[300px] object-contain",
                          "hover:opacity-90 transition-opacity"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          // Cleanup object URL
                          URL.revokeObjectURL(imageUrl)
                          imageUrlsRef.current.delete(index)
                          handleRemoveFile(index)
                        }}
                        className={cn(
                          "absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-black/70",
                          "text-white transition-colors"
                        )}
                        aria-label="Remove file"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  )
                }

                // Show file info for non-image files
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-muted border border-border"
                    )}
                  >
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground truncate max-w-[150px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className={cn("text-muted-foreground hover:text-foreground")}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <div className={cn("flex gap-3 items-center")}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.txt,.csv"
            />
            {activeSessionId && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleExportChat}
                disabled={messages.length === 0}
                className={cn(
                  "rounded-full h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation",
                  "lg:hidden"
                )}
                aria-label="Export chat"
                title={messages.length > 0 ? "Export chat history" : "Tidak ada pesan untuk di-export"}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || uploadingFiles}
              className={cn(
                "rounded-full h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation"
              )}
              aria-label="Attach file"
            >
              {uploadingFiles ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
              placeholder="Tanyakan apa saja tentang kampus, layanan, dll."
              disabled={isLoading || uploadingFiles}
              className={cn(
                "flex-1 border-input bg-background focus:border-primary focus:ring-primary rounded-full",
                "min-h-[44px] text-base"
              )}
          />
          <Button
            onClick={handleSend}
            disabled={(!inputValue.trim() && attachedFiles.length === 0) || isLoading || uploadingFiles}
            size="icon"
            className={cn(
              "bg-primary text-primary-foreground hover:bg-primary/90 rounded-full h-11 w-11 shadow-md",
              "min-h-[44px] min-w-[44px] touch-manipulation",
              (isLoading || uploadingFiles) && "opacity-70 cursor-not-allowed"
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
          </div>
        </div>
      </div>

      {/* Delete session confirmation modal */}
      {pendingDeleteSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-card shadow-xl border border-border p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Hapus sesi?</h3>
              <p className="text-sm text-muted-foreground">
                Sesi ini beserta seluruh percakapan akan dihapus permanen.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingDeleteSessionId(null)}
                className="min-w-[96px]"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDeleteSession(pendingDeleteSessionId)}
                className="min-w-[96px]"
                disabled={sessionActionLoading === pendingDeleteSessionId}
              >
                {sessionActionLoading === pendingDeleteSessionId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Hapus"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatInterface
