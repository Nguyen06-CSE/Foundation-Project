//frontend/digital-library/src/types/user.ts

export interface User {
  id: number
  username: string
  email: string
  full_name?: string | null
  role: string
  student_code?: string | null
  class_id?: number | null
  faculty_id?: number | null
  created_at?: string | null
}

export type UserRole = User['role']
