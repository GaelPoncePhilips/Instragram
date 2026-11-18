import { badRequest } from '../rules'

export type Body = Record<string, unknown>

export function obj(body: unknown): Body {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Body inválido')
  return body as Body
}

export function reqStr(b: Body, key: string, max?: number, min = 1): string {
  const v = b[key]
  if (typeof v !== 'string') throw badRequest(`${key} es obligatorio`)
  const t = v.trim()
  if (t.length < min) throw badRequest(`${key} no puede estar vacío`)
  if (max !== undefined && t.length > max) throw badRequest(`${key} supera ${max} caracteres`)
  return t
}

export function optStr(b: Body, key: string, max?: number): string | null | undefined {
  const v = b[key]
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v !== 'string') throw badRequest(`${key} debe ser texto`)
  if (max !== undefined && v.length > max) throw badRequest(`${key} supera ${max} caracteres`)
  return v
}

export function optBool(b: Body, key: string): boolean | undefined {
  const v = b[key]
  if (v === undefined) return undefined
  if (typeof v !== 'boolean') throw badRequest(`${key} debe ser booleano`)
  return v
}

export function optNum(b: Body, key: string): number | null | undefined {
  const v = b[key]
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v !== 'number' || !Number.isFinite(v)) throw badRequest(`${key} debe ser numérico`)
  return v
}

export function numArray(b: Body, key: string): number[] {
  const v = b[key]
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'number')) throw badRequest(`${key} debe ser una lista de ids`)
  return v as number[]
}

export function idParam(params: Record<string, string>, key: string): number {
  const n = Number(params[key])
  if (!Number.isInteger(n) || n < 1) throw badRequest(`${key} inválido`)
  return n
}
