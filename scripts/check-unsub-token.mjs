import { createHmac, timingSafeEqual } from "crypto"
import { existsSync, readFileSync } from "fs"

function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const envText = readFileSync(path, "utf8")
  return Object.fromEntries(
    envText
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const i = line.indexOf("=")
        let value = line.slice(i + 1).trim()
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        return [line.slice(0, i).trim(), value]
      })
  )
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") }
const dedicated = (env.UNSUBSCRIBE_SECRET ?? "").trim()
const fallback = (env.RESEND_API_KEY ?? "").trim()
const secret = dedicated || fallback

function check(token, secretValue) {
  const dot = token.lastIndexOf(".")
  if (dot <= 0) return false
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = createHmac("sha256", secretValue)
    .update(body)
    .digest("base64url")
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function mint(organizationId, email) {
  const payload = {
    v: 1,
    o: organizationId,
    e: email.trim().toLowerCase(),
  }
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  const sig = createHmac("sha256", secret).update(body).digest("base64url")
  return `${body}.${sig}`
}

const tokenArg = process.argv[2] ?? ""
const resendToken = process.argv[3] ?? ""

const minted = mint(1, "contact.coachstack@gmail.com")

console.log(
  JSON.stringify(
    {
      secretMeta: {
        hasUnsubscribeSecret: Boolean(dedicated),
        unsubscribeSecretLen: dedicated.length,
        unsubscribeSecretHasWhitespace: /\s/.test(dedicated),
        verifyWouldUse: dedicated ? "UNSUBSCRIBE_SECRET" : "RESEND_API_KEY",
      },
      mintedTokenPrefix: minted.slice(0, 24),
      mintedSelfCheck: check(minted, secret),
      argToken: tokenArg
        ? {
            len: tokenArg.length,
            payload: Buffer.from(
              tokenArg.slice(0, tokenArg.lastIndexOf(".")),
              "base64url"
            ).toString("utf8"),
            matchesSecret: check(tokenArg, secret),
            equalsMinted: tokenArg === minted,
          }
        : null,
      resendToken: resendToken
        ? {
            len: resendToken.length,
            payload: Buffer.from(
              resendToken.slice(0, resendToken.lastIndexOf(".")),
              "base64url"
            ).toString("utf8"),
            matchesSecret: check(resendToken, secret),
            equalsMinted: resendToken === minted,
            equalsArg: tokenArg ? resendToken === tokenArg : null,
          }
        : null,
    },
    null,
    2
  )
)
