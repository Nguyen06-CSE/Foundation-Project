// src/components/shared/documents/DocumentDetailView.tsx

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Heart, Download, Sparkles } from 'lucide-react'
import { FileIcon } from './FileIcon'
import { DocumentContextMenu, type DocumentAction } from './DocumentContextMenu'
import { GroupDocumentContextMenu } from '@/pages/group/components/shared/GroupDocumentContextMenu'
import { extractSummary } from '@/utils/textUtils'
import { cn } from '@/utils/cn'
import {
  type BaseDocumentViewProps,
  type DocumentListItem,
  getFileExtension,
  FILE_TYPE_THEMES,
  DEFAULT_THEME,
  safeFormatDate,
  safeFormatSize,
} from './documentView.types'

export interface DocumentDetailViewProps extends BaseDocumentViewProps {}

export function DocumentDetailView({
  documents,
  isLoading = false,
  onAction,
  navigationPath,
  showOwner = false,
  workspaceType = 'personal',
  permission = 'view',
  extraItems,
}: DocumentDetailViewProps) {
  const navigate = useNavigate()
  const [imageErrors, setImageErrors] = useState<Record<string | number, boolean>>({})

  const handleRowClick = (doc: DocumentListItem) => {
    if (navigationPath) {
      navigate(navigationPath(doc.id))
    } else if (doc.is_bundle) {
      navigate(`/personal/bundle/${doc.id}`)
    } else {
      navigate(`/personal/documents/${doc.id}`)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs divide-y divide-gray-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 px-4 py-4 animate-pulse">
            <div className="h-24 w-20 rounded-lg bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
              <div className="h-3 bg-gray-100 rounded w-4/5" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 rounded-xl border border-gray-200/80 bg-gray-50/50">
        <FileIcon type="default" className="h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500 font-medium">Chưa có tài liệu nào</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200/80 bg-white shadow-xs overflow-hidden divide-y divide-gray-100">
      {documents.map((doc) => {
        const displaySize = safeFormatSize(doc.size)
        const displayDate = safeFormatDate(doc.updatedAt)
        const ownerName = doc.owner?.full_name || doc.owner?.username
        const ownerAvatar = doc.owner?.avatar_url || doc.owner?.avatar

        const ext = getFileExtension(doc.extension || doc.type?.toString())
        const theme = FILE_TYPE_THEMES[ext] || DEFAULT_THEME
        const thumbnailUrl =
          doc.thumbnail_path && !imageErrors[doc.id]
            ? `${import.meta.env.VITE_API_URL || ''}/${doc.thumbnail_path}`
            : null

        return (
          <div
            key={doc.id}
            onClick={() => handleRowClick(doc)}
            className="group flex items-start gap-4 px-4 py-3 transition-all cursor-pointer hover:bg-slate-50/80"
          >
            {/* Thumbnail lớn */}
            <div
              className={cn(
                'relative shrink-0 h-24 w-20 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center transition-transform duration-200 group-hover:scale-105',
                theme.bg
              )}
            >
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={doc.title}
                  className="h-full w-full object-cover"
                  onError={() =>
                    setImageErrors((prev) => ({ ...prev, [doc.id]: true }))
                  }
                />
              ) : (
                <FileIcon
                  type={doc.type || 'default'}
                  className="h-8 w-8 text-gray-600"
                />
              )}
              <span
                className={cn(
                  'absolute bottom-1 right-1 px-1 rounded-sm text-[8px] font-bold uppercase tracking-tighter backdrop-blur-xs',
                  theme.badgeBg,
                  theme.badgeText
                )}
              >
                {ext || 'FILE'}
              </span>
            </div>

            {/* Thông tin chính */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <p
                  className="text-sm font-semibold text-gray-800 truncate group-hover:text-primary-600 transition-colors leading-snug"
                  title={doc.title}
                >
                  {doc.title}
                </p>
                {doc.pages && (
                  <span className="text-[10px] text-gray-400 font-medium px-1.5 py-0.5 bg-gray-100 rounded-md whitespace-nowrap">
                    {doc.pages} trang
                  </span>
                )}
              </div>

              {/* Tags */}
              {doc.tags && doc.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-1">
                  {doc.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md"
                    >
                      #{tag.name}
                    </span>
                  ))}
                  {doc.tags.length > 5 && (
                    <span className="text-[10px] text-gray-400 font-medium">
                      +{doc.tags.length - 5}
                    </span>
                  )}
                </div>
              )}

              {/* Tóm tắt & Nút AI */}
              <div className="mt-1">
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {extractSummary(doc.content, 40)}
                </p>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    alert(
                      'Nút này sẽ dùng AI để tóm tắt lại toàn bộ nội dung của file. TUY NHIÊN sẽ triển khai sau!'
                    )
                  }}
                  className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors border border-transparent hover:border-blue-100 w-fit"
                >
                  <Sparkles className="h-3 w-3" />
                  Tóm tắt tự động bằng AI
                </button>
              </div>
            </div>

            {/* Meta bên phải */}
            <div className="flex flex-col items-end gap-2 shrink-0 justify-center">
              {showOwner && (
                <div className="flex items-center gap-2">
                  {ownerAvatar ? (
                    <img
                      src={ownerAvatar}
                      alt={ownerName}
                      className="h-5 w-5 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User className="h-3 w-3 text-gray-500" />
                    </div>
                  )}
                  <span className="text-xs text-gray-600 truncate max-w-25">
                    {ownerName || 'Thành viên'}
                  </span>
                </div>
              )}

              <div className="text-[11px] font-medium text-gray-400 flex flex-col items-end gap-1">
                <span>{displayDate}</span>
                <span>{displaySize}</span>
              </div>

              <div
                className="flex items-center justify-end gap-1 mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="hidden group-hover:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onAction && workspaceType === 'personal' && (
                    <button
                      onClick={() => onAction('favorite', doc.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-500 rounded-md hover:bg-gray-100 transition-colors"
                      title="Yêu thích"
                    >
                      <Heart
                        className={cn(
                          'h-4 w-4',
                          doc.isFavorite && 'fill-rose-500 text-rose-500'
                        )}
                      />
                    </button>
                  )}
                  {onAction && (
                    <button
                      onClick={() => onAction('download', doc.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                      title="Tải xuống"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {workspaceType === 'group' ? (
                  <GroupDocumentContextMenu
                    permission={permission}
                    onAction={(action) => onAction?.(action, doc.id)}
                  />
                ) : (
                  <DocumentContextMenu
                    onAction={(action: DocumentAction) => onAction?.(action, doc.id)}
                    extraItems={extraItems}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}