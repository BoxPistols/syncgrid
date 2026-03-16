import { useState, useEffect, useRef } from 'react'
import { fetchOgp } from '../utils/fetchTitle'
import { loadMeta, saveMeta } from '../utils/storage'
import type { OgpData } from '../types'

interface Props {
  url: string
  bookmarkId: string
  x: number
  y: number
}

const OGP_CACHE_TTL = 24 * 60 * 60 * 1000 // 24時間キャッシュ

export function UrlPreview({ url, bookmarkId, x, y }: Props) {
  const [ogp, setOgp] = useState<OgpData | null>(null)
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      // キャッシュ確認
      const meta = await loadMeta(bookmarkId)
      if (meta?.ogp && Date.now() - meta.ogp.fetchedAt < OGP_CACHE_TTL) {
        if (!cancelled) {
          setOgp(meta.ogp)
          setLoading(false)
        }
        return
      }

      // OGP取得
      const data = await fetchOgp(url)
      if (cancelled) return
      if (data) {
        setOgp(data)
        // キャッシュ保存
        saveMeta(bookmarkId, { memo: meta?.memo ?? '', tags: meta?.tags, ogp: data })
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [url, bookmarkId])

  // ビューポート内に収める
  const style: React.CSSProperties = {
    left: Math.max(8, Math.min(x, window.innerWidth - 340)),
    top: Math.max(8, Math.min(y + 8, window.innerHeight - 260)),
  }

  if (loading) {
    return (
      <div ref={ref} className="sg-preview" style={style}>
        <div className="sg-preview__loading">
          <div className="sg-loading" />
        </div>
      </div>
    )
  }

  // OGPがなくても基本情報でプレビュー表示
  const title = ogp?.title
  const description = ogp?.description
  const image = ogp?.image
  const siteName = ogp?.siteName
  let domain = ''
  try {
    domain = new URL(url).hostname
  } catch {
    domain = url
  }

  return (
    <div ref={ref} className="sg-preview" style={style}>
      {image && (
        <div className="sg-preview__image">
          <img src={image} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />
        </div>
      )}
      <div className="sg-preview__body">
        {title && <div className="sg-preview__title">{title}</div>}
        {description && <div className="sg-preview__desc">{description}</div>}
        <div className="sg-preview__url">
          {siteName && <span className="sg-preview__site">{siteName}</span>}
          <span className="sg-preview__domain">{domain}</span>
        </div>
        {!title && !description && !image && (
          <div className="sg-preview__title">{domain}</div>
        )}
      </div>
    </div>
  )
}
