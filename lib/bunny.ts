import { serverError, badGateway } from "@/lib/api-helpers/api-response"

type UploadToBunnyParams = {
  file: File
  storagePath: string
}

export async function uploadToBunnyStorage({ file, storagePath }: UploadToBunnyParams) {
  const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE_NAME
  const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY
  const BUNNY_CDN_BASE = process.env.NEXT_PUBLIC_BUNNY_CDN_URL

  if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_API_KEY || !BUNNY_CDN_BASE) {
    return {
      ok: false as const,
      response: serverError("Bunny Storage is not configured"),
    }
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    const bunnyRes = await fetch(
      `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${storagePath}`,
      {
        method: "PUT",
        headers: {
          AccessKey: BUNNY_STORAGE_API_KEY,
          "Content-Type": file.type || "image/jpeg",
        },
        body: buffer,
      }
    )

    if (!bunnyRes.ok) {
      const text = await bunnyRes.text().catch(() => "")
      console.error("Bunny storage upload failed:", text)
      return {
        ok: false as const,
        response: badGateway(
          "Failed to upload to Bunny Storage",
          text || undefined
        ),
      }
    }

    const cdnTrimmed = BUNNY_CDN_BASE.replace(/\/$/, "")
    const url = `${cdnTrimmed}/${storagePath}`

    return {
      ok: true as const,
      url,
    }
  } catch (error) {
    console.error("Bunny storage upload error:", error)
    return {
      ok: false as const,
      response: serverError(
        "Unexpected error during upload",
        error instanceof Error ? error.message : String(error)
      ),
    }
  }
}

