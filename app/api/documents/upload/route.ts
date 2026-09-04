import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
    try {
        if (!supabase) {
            return NextResponse.json({ error: "Supabase not initialized" }, { status: 500 })
        }

        const formData = await request.formData()
        const file = formData.get("file") as File
        const userId = formData.get("userId") as string | null

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 })
        }

        if (file.size > 50 * 1024 * 1024) {
            return NextResponse.json({ error: "File size exceeds 50MB" }, { status: 400 })
        }

        const timestamp = Date.now()
        const fileName = `${timestamp}-${file.name.replace(/\s+/g, "-")}`
        const storagePath = `documents/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from("documents")
            .upload(storagePath, file, {
                contentType: "application/pdf",
                upsert: false,
            })

        if (uploadError) {
            return NextResponse.json({ error: uploadError.message }, { status: 500 })
        }

        const { data: urlData } = supabase.storage
            .from("documents")
            .getPublicUrl(storagePath)

        const { data: doc, error: dbError } = await supabase
            .from("documents")
            .insert({
                filename: file.name,
                storage_path: storagePath,
                url: urlData.publicUrl,
                status: "pending",
                uploaded_by: userId || null,
            })
            .select()
            .single()

        if (dbError) {
            return NextResponse.json({ error: dbError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, document: doc }, { status: 201 })
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}