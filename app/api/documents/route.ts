import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not initialized" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")

    const { data: docs, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ documents: docs || [] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not initialized" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 })
    }

    // Get storage path first
    const { data: doc } = await supabase
      .from("documents")
      .select("storage_path")
      .eq("id", id)
      .single()

    if (doc?.storage_path) {
      await supabase.storage.from("documents").remove([doc.storage_path])
    }

    const { error } = await supabase.from("documents").delete().eq("id", id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
