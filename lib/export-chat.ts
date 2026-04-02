import type { ChatMessage, ChatSession, ChatFile } from "./supabase"

export interface ExportOptions {
  includeTimestamps?: boolean
  includeFiles?: boolean
  format?: "text" | "markdown"
}

/**
 * Export chat session sebagai text file
 */
export function exportChatAsText(
  session: ChatSession,
  messages: (ChatMessage & { files?: ChatFile[] })[],
  options: ExportOptions = {}
): string {
  const {
    includeTimestamps = true,
    includeFiles = true,
    format = "text",
  } = options

  const lines: string[] = []

  // Header
  const sessionTitle = session.title || "Untitled Chat"
  const sessionDate = session.created_at
    ? new Date(session.created_at).toLocaleString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown date"

  if (format === "markdown") {
    lines.push(`# ${sessionTitle}`)
    lines.push(`\n**Tanggal:** ${sessionDate}`)
    lines.push(`**Total Pesan:** ${messages.length}`)
    lines.push("\n---\n")
  } else {
    lines.push("=".repeat(60))
    lines.push(sessionTitle.toUpperCase())
    lines.push("=".repeat(60))
    lines.push(`Tanggal: ${sessionDate}`)
    lines.push(`Total Pesan: ${messages.length}`)
    lines.push("=".repeat(60))
    lines.push("")
  }

  // Messages
  messages.forEach((message, index) => {
    const role = message.role === "user" ? "User" : "IMUII (AI)"
    const timestamp = includeTimestamps && message.created_at
      ? new Date(message.created_at).toLocaleString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null

    if (format === "markdown") {
      lines.push(`\n## ${role}${timestamp ? ` - ${timestamp}` : ""}`)
      lines.push("")
      lines.push(message.content || "(Tidak ada konten)")
    } else {
      lines.push(`[${role}${timestamp ? ` - ${timestamp}` : ""}]`)
      lines.push(message.content || "(Tidak ada konten)")
    }

    // Files
    if (includeFiles && message.files && message.files.length > 0) {
      const fileList = message.files
        .map((f) => `  - ${f.file_name} (${formatFileSize(f.file_size)})`)
        .join("\n")

      if (format === "markdown") {
        lines.push("\n**File terlampir:**")
        lines.push("```")
        lines.push(fileList)
        lines.push("```")
      } else {
        lines.push("  [File terlampir:]")
        lines.push(fileList)
      }
    }

    lines.push("")
  })

  // Footer
  if (format === "text") {
    lines.push("=".repeat(60))
    lines.push(`Dibuat dengan IMUII Assistant`)
    lines.push(`Export date: ${new Date().toLocaleString("id-ID")}`)
    lines.push("=".repeat(60))
  }

  return lines.join("\n")
}

/**
 * Format file size ke human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

/**
 * Download text sebagai file
 */
export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}









