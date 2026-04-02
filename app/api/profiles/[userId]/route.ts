import { NextResponse } from "next/server"
import { getUserProfile, upsertUserProfile } from "@/lib/supabase"

interface RouteParams {
  params: {
    userId: string
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const userId = params.userId
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const profile = await getUserProfile(userId)
    if (!profile) {
      return NextResponse.json({ profile: null }, { status: 200 })
    }

    return NextResponse.json({ profile }, { status: 200 })
  } catch (error) {
    console.error("GET /api/profiles/[userId] error:", error)
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const userId = params.userId
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { display_name, tone, interests, lang } = body || {}

    const profile = await upsertUserProfile({
      userId,
      displayName: display_name,
      tone,
      interests,
      lang,
    })

    return NextResponse.json({ profile }, { status: 200 })
  } catch (error) {
    console.error("PATCH /api/profiles/[userId] error:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}

