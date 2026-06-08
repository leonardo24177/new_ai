// lib/model-pricing.ts
// Prezzi per milione di token (USD)

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
  'claude-opus-4-8': { input: 15.00, output: 75.00 },
}

export function calcolaCosto(model: string, tokensInput: number, tokensOutput: number): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return 0
  const costoInput = (tokensInput / 1_000_000) * pricing.input
  const costoOutput = (tokensOutput / 1_000_000) * pricing.output
  return costoInput + costoOutput
}

export function formatCosto(costo: number): string {
  if (costo < 0.001) return `$${(costo * 1000).toFixed(4)}m`
  return `$${costo.toFixed(4)}`
}

export function modelLabel(model: string): string {
  if (model.includes('haiku')) return 'Haiku'
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('opus')) return 'Opus'
  return model
}

export function modelColor(model: string): string {
  if (model.includes('haiku')) return 'text-green-600 bg-green-50'
  if (model.includes('sonnet')) return 'text-blue-600 bg-blue-50'
  if (model.includes('opus')) return 'text-purple-600 bg-purple-50'
  return 'text-gray-600 bg-gray-50'
}
