import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    // Handle authentication errors gracefully - don't throw for expected 401s on auth endpoints
    // This is normal when checking if user is logged in
    if (res.status === 401 && res.url.includes('/api/auth/')) {
      // Return a special error that will be caught and handled silently
      const error = new Error(`Authentication check: ${res.status}`);
      (error as any).isAuthCheck = true; // Mark as expected auth check
      throw error;
    }
    throw new Error(`${res.status}: ${text}`);
  }
}

// API Base URL - use same-origin to avoid CORS issues
const API_BASE_URL = "";

// Add retry logic for backend connection - handle startup timing gracefully
async function retryFetch(url: string, options: RequestInit, retries = 5, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      // Success - return response immediately
      return response;
    } catch (error) {
      // Handle network connection failures during backend startup
      if (i < retries - 1) {
        // Only log on first few attempts to reduce noise
        if (i < 2) {
          console.log(`Backend starting up, retrying connection... (attempt ${i + 1}/${retries})`);
        }
        // Use exponential backoff for startup delays
        const backoffDelay = delay * Math.pow(1.5, i);
        await new Promise(resolve => setTimeout(resolve, Math.min(backoffDelay, 5000)));
      } else {
        // Final attempt failed - this is a real connection issue
        console.error(`Unable to connect to backend after ${retries} attempts`);
        // Don't throw here, let the caller handle the error
        return new Response(JSON.stringify({detail: "Backend connection failed"}), { 
          status: 503, 
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }
  throw new Error('All retry attempts failed');
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  }
): Promise<Response> {
  const method = options?.method || "GET";
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const res = await retryFetch(fullUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",  // Re-enable credentials for session auth
  });

  await throwIfResNotOk(res);
  return res;
}

export async function apiRequestWithMethod(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const url = Array.isArray(queryKey) ? String(queryKey[0]) : String(queryKey);
      const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
      const res = await retryFetch(fullUrl, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",  // Re-enable credentials for session auth
      });

      // Handle 401s on auth endpoints silently (expected when not logged in)
      if (res.status === 401 && url.includes('/api/auth/')) {
        return null;
      }

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      // Handle startup connection failures gracefully
      if (error?.message?.includes('Backend connection failed')) {
        // Silent fail for startup issues - don't spam console
        return null;
      }
      // Handle authentication errors gracefully - return null for 401s
      // Check both the error message and the special flag
      if (error?.isAuthCheck || 
          error?.message?.includes('401') || 
          error?.message?.includes('Unauthorized') || 
          error?.message?.includes('Authentication required') || 
          error?.message?.includes('Authentication check:')) {
        // Silent return for expected auth failures - don't log these
        return null;
      }
      // Log other errors for debugging (but not auth checks which are expected)
      console.error('Query function error:', error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5000,
      retry: false,
      // Add global error handling to prevent unhandled rejections
      throwOnError: false,
      // Suppress console errors for expected 401s on auth endpoints
      onError: (error: any) => {
        // Don't log expected authentication check failures
        if (error?.isAuthCheck || 
            error?.message?.includes('Authentication check:') ||
            (error?.message?.includes('401') && error?.message?.includes('/api/auth/'))) {
          return; // Silent - this is expected behavior
        }
        // Log other errors normally
        console.error('Query error:', error);
      },
    },
    mutations: {
      retry: false,
      throwOnError: false,
    },
  },
});
