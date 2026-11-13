// src/components/shared/documents/documentView.types.ts

import { type FileTypeMap } from './FileIcon'
import { formatSize } from '@/utils/formatSize'
import { formatRelativeDate } from '@/utils/formatDate'

export {
  getFileExtension,
  FILE_TYPE_THEMES,
  DEFAULT_THEME,
} from '@/utils/fileTypeTheme'

export interface DocumentListItem {
  id: string | number
  title: string
  type?: FileTypeMap | string
  extension?: string
  updatedAt?: string
  size?: number | string
  thumbnail_path?: string | null
  markdown_path?: string | null
  description?: string
  content?: string | null
  pages?: number | null
  owner?: {
    full_name?: string
    username?: string
    avatar?: string | null
    avatar_url?: string | null
  }
  workspace_type?: 'personal' | 'group' | 'shared' | 'community'
  tags?: Array<{ id: number; name: string; color?: string }>
  isFavorite?: boolean
  is_bundle?: boolean
  bundle_parent_id?: number | null
  bundle_children_count?: number | null
  view_count?: number
  personal_view_count?: number
  trending_score?: number
  rating_avg?: number
  rating_count?: number
  download_count?: number
  doc_type?: string | null
  academic_year?: string | null
}

export interface BaseDocumentViewProps {
  documents: DocumentListItem[]
  isLoading?: boolean
  onAction?: (action: string, docId: string | number) => void
  navigationPath?: (docId: string | number) => string
  showOwner?: boolean
  workspaceType?: 'personal' | 'group' | 'shared' | 'community'
  permission?: 'owner' | 'full' | 'view'
  allowedActions?: any[]
  extraItems?: any[]
  selectedIds?: (string | number)[]
  onToggleSelect?: (docId: string | number) => void
}

export function safeFormatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  if (dateStr.includes('/') || dateStr.includes('trước') || dateStr.includes('ago')) {
    return dateStr
  }
  const timestamp = Date.parse(dateStr)
  return !isNaN(timestamp) ? formatRelativeDate(dateStr) : dateStr
}

export function safeFormatSize(size?: number | string): string {
  if (size === undefined || size === null || size === '') return '—'
  if (typeof size === 'number') return formatSize(size)
  return size
}