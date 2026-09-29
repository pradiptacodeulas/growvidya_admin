export interface PermissionItem {
  module_key: string
  module_name: string
  can_view: number
  can_add: number
  can_edit: number
  can_delete: number
  can_manage: number
}

export interface AdminProfile {
  id: number
  first_name: string
  last_name: string
  name?: string
  gender: number | string
  gender_id?: number
  gender_name?: string
  profile_image: string | null
  phone_number: string
  email: string
  role: string
  role_id?: number
  role_name?: string
  status: number
  created_at: string
  updated_at: string
  permissions?: PermissionItem[]
}

export interface ProfileApiResponse {
  success: boolean
  message: string
  data: AdminProfile
}

export interface GenderItem {
  id: number
  gender: string
  name: string
}

export interface GendersApiResponse {
  success: boolean
  message: string
  data: GenderItem[]
}

export interface UpdateProfileParams {
  first_name?: string
  last_name?: string
  email?: string
  phone_number?: string
  gender?: number | string
  profile_image?: File | null
}

export interface User {
  id: number
  name?: string
  email: string
  role: string
  status: number
  first_name?: string
  last_name?: string
  gender?: number | string
  gender_id?: number
  gender_name?: string
  profile_image?: string | null
  phone_number?: string
  created_at?: string
  updated_at?: string
}
