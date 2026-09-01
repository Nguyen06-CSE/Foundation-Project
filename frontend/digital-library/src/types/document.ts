export interface Tag {
  id: number
  name: string
  color?: string
}

export interface Folder {
  id: number
  name: string
  color?: string
  tag_count: number
  document_count: number
  tags: Tag[]
  created_at: string
}

export interface Document {
  id: number
  title: string
  file_path?: string;
  file_type: string
  file_size: number      // bytes
  created_at: string
  updated_at: string
  is_important: boolean
  category_id?: number
  description?: string
}

export interface PaginatedDocuments {
  items: Document[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
