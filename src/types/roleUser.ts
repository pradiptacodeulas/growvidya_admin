export interface SaasModule {
  id: number
  module_key: string
  module_name: string
  description?: string | null
  display_order?: number
  status: number
}

export interface RolePermission {
  module_key: string
  module_name?: string
  description?: string | null
  can_view: number
  can_add: number
  can_edit: number
  can_delete: number
  can_manage: number
}

export interface SaasRole {
  id: number
  role_name: string
  slug?: string | null
  description?: string | null
  is_system: number
  status: number
  assigned_users_count?: number
  active_modules_count?: number
  permissions?: RolePermission[]
  created_at?: string
  updated_at?: string
}

export interface CreateRolePayload {
  role_name: string
  slug?: string
  description?: string
  status?: number
  permissions: Array<{
    module_key: string
    can_view: number | boolean
    can_add: number | boolean
    can_edit: number | boolean
    can_delete: number | boolean
    can_manage: number | boolean
  }>
}

export interface UpdateRolePayload {
  role_name?: string
  slug?: string
  description?: string
  status?: number
  permissions?: Array<{
    module_key: string
    can_view: number | boolean
    can_add: number | boolean
    can_edit: number | boolean
    can_delete: number | boolean
    can_manage: number | boolean
  }>
}

export interface SubAdminUser {
  id: number
  first_name: string
  last_name?: string | null
  gender?: number | null
  gender_id?: number | null
  gender_name?: string | null
  profile_image?: string | null
  phone_number?: string | null
  email: string
  role: string
  role_id: number
  role_name?: string | null
  role_description?: string | null
  role_status?: number | null
  status: number
  permissions?: RolePermission[]
  created_at?: string
  updated_at?: string
}

export interface SubAdminsPagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface SubAdminsListResult {
  sub_admins: SubAdminUser[]
  pagination: SubAdminsPagination
}

export interface CreateSubAdminPayload {
  first_name: string
  last_name?: string
  email: string
  password: string
  gender?: number | string | null
  phone_number?: string
  role_id: number
  status?: number
  profile_image?: File | string | null
}

export interface UpdateSubAdminPayload {
  first_name?: string
  last_name?: string
  email?: string
  password?: string
  gender?: number | string | null
  phone_number?: string
  role_id?: number
  status?: number
  profile_image?: File | string | null
}
