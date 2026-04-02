import { NextResponse } from "next/server"
import { updateChatMessage } from "@/lib/supabase"
import { validateSessionOwnership } from "@/lib/session-ownership"

interface RouteParams {
  params: {
    sessionId: string
    messageId: string
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    // Get userId from query params (consistent with other API routes)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Validate session ownership
    const isOwner = await validateSessionOwnership(params.sessionId, userId)
    if (!isOwner) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    const { content } = await request.json().catch(() => ({}))

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required and must be a string" },
        { status: 400 }
      )
    }

    // Allow empty content (for messages with only files)
    const messageContent = content.trim()

    const updatedMessage = await updateChatMessage(params.messageId, messageContent)

    if (!updatedMessage) {
      return NextResponse.json(
        { error: "Failed to update message" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: updatedMessage }, { status: 200 })
  } catch (error) {
    console.error(`PATCH message ${params.messageId} failed:`, error)
    return NextResponse.json(
      { error: "Failed to update message" },
      { status: 500 }
    )
  }
}

