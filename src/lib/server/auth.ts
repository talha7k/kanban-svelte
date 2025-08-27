import { auth } from './firebase';
import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { UserId } from '$lib/types/types';

/**
 * Extract Firebase ID token from request headers
 */
function extractTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Verify Firebase ID token and return user ID
 */
export async function verifyAuthToken(token: string): Promise<UserId> {
  const adminAuth = auth();
  if (!adminAuth) {
    throw new Error('Firebase Admin Auth not initialized');
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid as UserId;
  } catch (err) {
    console.error('Token verification failed:', err);
    throw new Error('Invalid or expired authentication token');
  }
}

/**
 * Get authenticated user ID from request
 * Throws SvelteKit error if authentication fails
 */
export async function getAuthenticatedUserId(request: Request): Promise<UserId> {
  const token = extractTokenFromRequest(request);
  
  if (!token) {
    throw error(401, 'Authentication required: Missing or invalid authorization header');
  }

  try {
    return await verifyAuthToken(token);
  } catch (err) {
    throw error(401, err instanceof Error ? err.message : 'Authentication failed');
  }
}

/**
 * Middleware function to authenticate requests
 * Returns user ID if successful, throws SvelteKit error if not
 */
export async function requireAuth(event: RequestEvent): Promise<UserId> {
  return await getAuthenticatedUserId(event.request);
}

/**
 * Optional authentication - returns user ID if token is valid, null if no token
 * Throws error only if token is present but invalid
 */
export async function optionalAuth(request: Request): Promise<UserId | null> {
  const token = extractTokenFromRequest(request);
  
  if (!token) {
    return null;
  }

  try {
    return await verifyAuthToken(token);
  } catch (err) {
    throw error(401, err instanceof Error ? err.message : 'Invalid authentication token');
  }
}