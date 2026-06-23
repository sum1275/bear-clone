export async function apiCall(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (options.headers && typeof options.headers === 'object') {
    Object.assign(headers, options.headers)
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // If 401, token expired or invalid - clear from both storages
  if (response.status === 401) {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.dispatchEvent(new Event('authChange'))
  }

  return response
}
