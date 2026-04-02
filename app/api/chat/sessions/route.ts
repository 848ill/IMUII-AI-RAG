import { NextResponse } from "next/server"
import { createChatSession, getRecentChatSessions } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    // Get userId from query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Filter by userId - even if RLS is disabled, we filter at application level
    // Reduced limit from 25 to 12 for better performance
    const sessions = await getRecentChatSessions(12, userId)
    
    // Add cache headers and optimize response
    return NextResponse.json(
      { sessions },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60", // Cache for 30s, serve stale for 60s
          "Content-Type": "application/json",
        },
      }
    )
  } catch (error) {
    console.error("GET /api/chat/sessions error:", error)
    return NextResponse.json(
      { error: "Failed to load chat sessions" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { title, userId } = await request.json().catch(() => ({}))
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    const session = await createChatSession(title, userId)

    if (!session) {
      return NextResponse.json(
        { error: "Unable to create chat session" },
        { status: 500 }
      )
    }

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error("POST /api/chat/sessions error:", error)
    return NextResponse.json(
      { error: "Failed to create chat session" },
      { status: 500 }
    )
  }
}

