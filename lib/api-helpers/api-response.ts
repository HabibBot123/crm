import { NextResponse } from "next/server"

export function jsonResponse(status: number, data: unknown) {
  return NextResponse.json(data, { status })
}

export function ok(data: unknown) {
  return jsonResponse(200, data)
}

export function badRequest(message: string, details?: unknown) {
  return jsonResponse(400, { error: message, ...(details != null && { details }) })
}

export function unauthorized(message: string, details?: unknown) {
  return jsonResponse(401, { error: message, ...(details != null && { details }) })
}

export function forbidden(message: string, details?: unknown) {
  return jsonResponse(403, { error: message, ...(details != null && { details }) })
}

export function notFound(message: string, details?: unknown) {
  return jsonResponse(404, { error: message, ...(details != null && { details }) })
}

export function conflict(message: string, details?: unknown) {
  return jsonResponse(409, { error: message, ...(details != null && { details }) })
}

export function serverError(message: string, details?: unknown) {
  return jsonResponse(500, {
    error: message,
    details: details ?? message,
  })
}

export function badGateway(message: string, details?: unknown) {
  return jsonResponse(502, {
    error: message,
    details: details ?? message,
  })
}
