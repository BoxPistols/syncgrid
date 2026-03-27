/**
 * SVGアイコンコンポーネント — 絵文字をSVGに統一
 * Lucide風のシンプルなアイコンセット
 */
import { memo } from 'react'

interface Props {
  name: IconName
  size?: number
  className?: string
}

export type IconName =
  | 'search'
  | 'edit'
  | 'trash'
  | 'folder'
  | 'folder-open'
  | 'link'
  | 'close'
  | 'spinner'
  | 'refresh'
  | 'sparkle'
  | 'check-circle'
  | 'x-circle'
  | 'upload'
  | 'download'
  | 'sun'
  | 'moon'
  | 'bot'
  | 'warning'
  | 'keyboard'
  | 'lock'
  | 'more'
  | 'grid'
  | 'plus'
  | 'pin'
  | 'chevron-down'
  | 'arrow-left'
  | 'settings'
  | 'tag'
  | 'help-circle'
  | 'columns'

const PATHS: Record<IconName, string> = {
  search: 'M11 6a5 5 0 110 10 5 5 0 010-10zm0-2a7 7 0 104.9 12l3.5 3.6 1.4-1.4-3.5-3.6A7 7 0 0011 4z',
  edit: 'M15.2 3.8a2.4 2.4 0 013.4 3.4L7.7 18.1l-4.4 1.1 1.1-4.4L15.2 3.8z',
  trash:
    'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6',
  folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  'folder-open':
    'M5 19h14a2 2 0 002-2V8a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2zM3 12h4l1.5-3H21',
  link: 'M10 14a3.5 3.5 0 005 0l4-4a3.5 3.5 0 00-5-5l-.5.5M14 10a3.5 3.5 0 00-5 0l-4 4a3.5 3.5 0 005 5l.5-.5',
  close: 'M18 6L6 18M6 6l12 12',
  spinner: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83',
  refresh: 'M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15',
  sparkle: 'M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z',
  'check-circle': 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
  'x-circle': 'M12 22a10 10 0 110-20 10 10 0 010 20zM15 9l-6 6M9 9l6 6',
  upload: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  sun: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
  moon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
  bot: 'M12 2a2 2 0 012 2v1h3a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h3V4a2 2 0 012-2zM9 13h2M13 13h2M8 9h8',
  warning: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  keyboard: 'M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM6 10h0M10 10h0M14 10h0M18 10h0M8 14h8',
  lock: 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4',
  more: 'M12 13a1 1 0 100-2 1 1 0 000 2zM19 13a1 1 0 100-2 1 1 0 000 2zM5 13a1 1 0 100-2 1 1 0 000 2z',
  grid: 'M3.75 1.5h4.5q2.25 0 2.25 2.25v4.5q0 2.25-2.25 2.25h-4.5q-2.25 0-2.25-2.25v-4.5q0-2.25 2.25-2.25zM15.75 1.5h4.5q2.25 0 2.25 2.25v4.5q0 2.25-2.25 2.25h-4.5q-2.25 0-2.25-2.25v-4.5q0-2.25 2.25-2.25zM3.75 13.5h4.5q2.25 0 2.25 2.25v4.5q0 2.25-2.25 2.25h-4.5q-2.25 0-2.25-2.25v-4.5q0-2.25 2.25-2.25zM15.75 13.5h4.5q2.25 0 2.25 2.25v4.5q0 2.25-2.25 2.25h-4.5q-2.25 0-2.25-2.25v-4.5q0-2.25 2.25-2.25z',
  plus: 'M12 5v14M5 12h14',
  pin: 'M12 2a5 5 0 00-5 5c0 4 5 11 5 11s5-7 5-11a5 5 0 00-5-5zm0 7a2 2 0 110-4 2 2 0 010 4z',
  'chevron-down': 'M6 9l6 6 6-6',
  'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
  settings:
    'M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2zM12 15a3 3 0 100-6 3 3 0 000 6z',
  tag: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
  'help-circle': 'M12 22a10 10 0 110-20 10 10 0 010 20zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01',
  columns: 'M3 3h5v18H3zM10 3h4v14h-4zM16 3h5v10h-5z',
}

export const Icon = memo(function Icon({ name, size = 16, className }: Props) {
  const isStroke = ![
    'search',
    'sparkle',
    'grid',
    'pin',
    'moon',
    'columns',
  ].includes(name)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isStroke ? 'none' : 'currentColor'}
      stroke={isStroke ? 'currentColor' : 'none'}
      strokeWidth={isStroke ? 2 : 0}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
})
