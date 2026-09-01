export interface User {
  id: number
  username: string
  email: string
  full_name?: string
  role: 'student' | 'teacher' | 'faculty_admin' | 'school_admin' | 'system_admin'
  student_code?: string
}

export type UserRole = User['role']
