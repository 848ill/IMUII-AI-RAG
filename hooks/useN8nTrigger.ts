// hooks/useN8nTrigger.ts (VERSI FINAL DEFENSif)
"use client"

import { useState } from "react"

export function useN8nTrigger() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trigger = async (data?: Record<string, any>) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data || {}),
      })

      // --- LOGIKA RESPON DEFENSif (MENANGANI PLAIN TEXT DAN JSON) ---
      let resultData: any;
      
      try {
          // 1. Coba baca sebagai JSON (Berhasil jika 200 OK dan format JSON)
          resultData = await response.json();
          console.log("✅ N8N API Response (JSON):", JSON.stringify(resultData).substring(0, 300));
      } catch (jsonError) {
          // 2. Jika GAGAL, baca respons sebagai text biasa (kemungkinan plain text/error)
          const plainText = await response.text();
          console.log("⚠️ N8N API Response (Text):", plainText.substring(0, 300));
          
          // Asumsi: Jika status OK, ini adalah balasan AI dalam bentuk teks.
          if (response.ok) {
              resultData = { success: true, data: { text: plainText } };
          } else {
              // Jika status 4xx/5xx, anggap plain text adalah pesan error.
              throw new Error(plainText || `N8N returned status: ${response.status}`);
          }
      }
      // ---------------------------------------------------------------------

      if (!response.ok) {
          // Jika status tidak OK (4xx/5xx), lempar error dengan data yang berhasil kita baca
          const errorMsg = resultData?.error || resultData?.data?.error || resultData?.text || "Failed to trigger N8N webhook";
          console.error("❌ N8N API Error:", errorMsg);
          throw new Error(errorMsg);
      }

      // Extract text dari berbagai format response
      let extractedText = "";
      
      if (resultData?.data) {
        // Format dari API route kita: { success: true, data: { text: "...", raw: ... } }
        if (resultData.data.text) {
          extractedText = resultData.data.text;
        } else if (typeof resultData.data === "string") {
          extractedText = resultData.data;
        } else if (resultData.data.raw) {
          // Fallback ke raw jika text tidak ada
          if (typeof resultData.data.raw === "string") {
            extractedText = resultData.data.raw;
          } else {
            extractedText = JSON.stringify(resultData.data.raw);
          }
        }
      } else if (resultData?.text) {
        extractedText = resultData.text;
      } else if (resultData?.message) {
        extractedText = resultData.message;
      } else if (typeof resultData === "string") {
        extractedText = resultData;
      }

      // Final fallback
      if (!extractedText || extractedText.trim() === "") {
        console.warn("⚠️ No text extracted, using fallback");
        extractedText = "Balasan dari AI tidak terformat dengan benar. Cek log server.";
      }

      console.log("✅ Extracted text:", extractedText.substring(0, 200));

      const finalResult = { 
          success: true, 
          data: { 
              text: extractedText
          } 
      };
      
      return finalResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { trigger, isLoading, error }
}