const PALETTE = [
  '#1e3a5f',
  '#1e3d2f',
  '#3d1e2f',
  '#2d2a1e',
  '#1e2d3d',
  '#2d1e3d',
  '#3d2a1e',
  '#1e3d3a',
  '#3a1e1e',
  '#2a3d1e',
]

export function getCardColor(domain: string): string {
  let hash = 0
  for (let i = 0; i < domain.length; i++) {
    hash = (hash * 31 + domain.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}
