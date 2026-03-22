// Determine the API Base based on environment.
// In development, it uses the current hostname (localhost or local IP) with port 8000. 
// In production, it uses the NEXT_PUBLIC_API_URL or defaults to pythonanywhere.
let API_BASE = "https://dgenit.pythonanywhere.com/api";

if (process.env.NODE_ENV !== "production") {
  if (typeof window !== "undefined") {
    // Support testing from mobile devices on local network
    API_BASE = `http://${window.location.hostname}:8000/api`;
  } else {
    API_BASE = "http://localhost:8000/api";
  }
} else {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    API_BASE = envUrl.endsWith("/api") || envUrl.endsWith("/api/") 
      ? envUrl 
      : `${envUrl.replace(/\/$/, "")}/api`;
  }
}

export const API_URL = API_BASE;
export const HOST_URL = API_BASE.replace(/\/api$/, "");



/**
 * Get stored Django JWT access token
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("django_access_token");
}

/**
 * Get stored Django JWT refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("django_refresh_token");
}

/**
 * Store Django JWT tokens after login
 */
export function storeTokens(access: string, refresh: string) {
  localStorage.setItem("django_access_token", access);
  localStorage.setItem("django_refresh_token", refresh);
}

/**
 * Store user data from Django login response
 */
export function storeUserData(user: Record<string, any>) {
  localStorage.setItem("django_user", JSON.stringify(user));
}

/**
 * Get stored Django user data
 */
export function getDjangoUser(): Record<string, any> | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("django_user");
  return raw ? JSON.parse(raw) : null;
}

/**
 * Clear all stored auth tokens and user data
 */
export function clearAuthData() {
  localStorage.removeItem("django_access_token");
  localStorage.removeItem("django_refresh_token");
  localStorage.removeItem("django_user");
}

/**
 * Request OTP from Django backend using email.
 * This is Step 1 of the login process.
 */
export async function loginWithDjango(email: string) {
  const res = await fetch(`${API_BASE}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "فشل إرسال رمز التحقق.");
  }
  
  return data; // Returns success message
}

/**
 * Verify OTP with Django backend using email and OTP code.
 * This is Step 2 of the login process. Returns user data and stores JWT tokens.
 */
export async function verifyOTPWithDjango(email: string, otp_code: string) {
  const res = await fetch(`${API_BASE}/auth/verify-otp/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp_code }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "رمز التحقق غير صحيح أو منتهي الصلاحية.");
  }

  storeTokens(data.access, data.refresh);
  storeUserData(data.user);
  return data.user;
}

/**
 * Make an authenticated API request to Django backend.
 * Automatically includes the JWT Authorization header.
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let res = await fetch(`${API_BASE}/${endpoint.replace(/^\//, "")}`, {
    ...options,
    headers,
  });

  // Handle Token expiration by refreshing
  if (res.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          storeTokens(refreshData.access, refreshToken); // Keep old refresh or update if a new one is returned (in this case DRF usually just returns access)
          
          // Retry original request with new token
          headers["Authorization"] = `Bearer ${refreshData.access}`;
          res = await fetch(`${API_BASE}/${endpoint.replace(/^\//, "")}`, {
            ...options,
            headers,
          });
        } else {
            // refresh token expired or invalid, clear everything
            clearAuthData();
            if (typeof window !== "undefined") {
              window.location.href = '/';
            }
        }
      } catch (err) {
        // refresh failed network wise
      }
    }
  }

  return res;
}

/**
 * GET request shorthand
 */
export async function apiGet(endpoint: string) {
  return apiRequest(endpoint, { method: "GET" });
}

/**
 * POST request shorthand with JSON body
 */
export async function apiPost(endpoint: string, body?: any) {
  return apiRequest(endpoint, {
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

/**
 * PUT request shorthand with JSON body
 */
export async function apiPut(endpoint: string, body?: any) {
  return apiRequest(endpoint, {
    method: "PUT",
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

/**
 * DELETE request shorthand
 */
export async function apiDelete(endpoint: string) {
  return apiRequest(endpoint, {
    method: "DELETE",
  });
}
