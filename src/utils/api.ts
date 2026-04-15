/**
 * API 请求封装
 */

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export const request = async <T = any>(
  baseUrl: string,
  body: any
): Promise<ApiResponse<T>> => {
  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      return {
        success: false,
        error: `请求失败: ${res.status}`,
      }
    }

    const data = await res.json()
    return data as ApiResponse<T>
  } catch (e: any) {
    return {
      success: false,
      error: e.message || '网络请求失败',
    }
  }
}
