import { NextResponse } from "next/server"
import { getSessionMessages, insertChatMessage, getSessionFiles } from "@/lib/supabase"
import { validateSessionOwnership } from "@/lib/session-ownership"
import type { ChatFile } from "@/lib/supabase"

interface RouteParams {
  params: {
    sessionId: string
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Get userId from query params for validation
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    // If userId provided, validate ownership
    if (userId) {
      const isOwner = await validateSessionOwnership(params.sessionId, userId)
      if (!isOwner) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        )
      }
    }

    // Load messages and files in parallel for better performance
    const [messages, files] = await Promise.all([
      getSessionMessages(params.sessionId),
      getSessionFiles(params.sessionId),
    ])
    
    // Create a map for O(1) lookup instead of O(n*m) nested loop
    const filesByMessageId = new Map<string, ChatFile[]>()
    files.forEach((file) => {
      if (file.message_id) {
        const existing = filesByMessageId.get(file.message_id) || []
        existing.push(file)
        filesByMessageId.set(file.message_id, existing)
      }
    })
    
    // Attach files to messages efficiently
    const messagesWithFiles = messages.map((message) => {
      const messageFiles = filesByMessageId.get(message.id)
      return {
        ...message,
        files: messageFiles && messageFiles.length > 0 ? messageFiles : undefined,
      }
    })
    
    return NextResponse.json(
      { messages: messagesWithFiles },
      {
        headers: {
          "Cache-Control": "private, max-age=60", // Cache for 60 seconds
        },
      }
    )
  } catch (error) {
    console.error(`GET messages for session ${params.sessionId} failed:`, error)
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { role, content, userId } = await request.json().catch(() => ({}))

    if (!role || !["user", "assistant"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role value" },
        { status: 400 }
      )
    }

    // Allow empty content for messages with file attachments
    // Content can be empty if user only sends files without text
    const messageContent = content?.trim() || ""

    const message = await insertChatMessage({
      sessionId: params.sessionId,
      role,
      content: messageContent,
      userId,
    })

    if (!message) {
      return NextResponse.json(
        { error: "Unable to store chat message" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error(`POST message for session ${params.sessionId} failed:`, error)
    return NextResponse.json(
      { error: "Failed to store message" },
      { status: 500 }
    )
  }
}

