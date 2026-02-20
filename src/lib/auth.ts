import { NextRequest } from 'next/server';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  membership: 'guest' | 'basic' | 'vip' | 'premium';
  role: 'user' | 'moderator' | 'admin';
  isBanned?: boolean;
  banReason?: string;
  emailVerified?: boolean;
  createdAt: number;
  lastLoginAt?: number;
  subscriptionEnd?: number;
  subscriptionCancelled?: boolean;
  subscriptionCancelledAt?: string;
}

export type MembershipTier = 'guest' | 'basic' | 'vip' | 'premium';
export type UserRole = 'user' | 'moderator' | 'admin';

/**
 * Extract and verify user from request Authorization header
 * Expected format: "Bearer <base64-encoded-user-json>"
 */
export function getUserFromRequest(request: NextRequest): User | null {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const user = JSON.parse(decoded) as User;

    // Basic validation
    if (!user.id || !user.email || !user.membership) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error parsing user from request:', error);
    return null;
  }
}

/**
 * Check if user's subscription is still active
 */
export function isSubscriptionActive(user: User): boolean {
  // Guest and basic don't have subscription end dates
  if (user.membership === 'guest' || user.membership === 'basic') {
    return true;
  }

  // Check if premium/vip subscription hasn't expired
  if (user.subscriptionEnd && user.subscriptionEnd > Date.now()) {
    return true;
  }

  return false;
}

/**
 * Check if user has required membership tier or higher
 * Tier hierarchy: guest < basic < vip < premium
 */
export function hasRequiredMembership(
  user: User | null,
  requiredTier: MembershipTier
): boolean {
  if (!user) {
    // No user = guest access only
    return requiredTier === 'guest';
  }

  if (user.isBanned) {
    return false;
  }

  // Check subscription status for premium tiers
  if ((user.membership === 'vip' || user.membership === 'premium') &&
    !isSubscriptionActive(user)) {
    return false;
  }

  const tierLevels: Record<MembershipTier, number> = {
    guest: 0,
    basic: 1,
    vip: 2,
    premium: 3,
  };

  const userLevel = tierLevels[user.membership] || 0;
  const requiredLevel = tierLevels[requiredTier] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Check if user has required role
 */
export function hasRequiredRole(
  user: User | null,
  requiredRole: UserRole | UserRole[]
): boolean {
  if (!user) {
    return false;
  }

  if (user.isBanned) {
    return false;
  }

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(user.role);
}

/**
 * Check if user is admin
 */
export function isAdmin(user: User | null): boolean {
  return hasRequiredRole(user, 'admin');
}

/**
 * Generate auth token for client to send in requests
 */
export function generateAuthToken(user: User): string {
  const userJson = JSON.stringify(user);
  return Buffer.from(userJson, 'utf-8').toString('base64');
}

/**
 * Auth error responses
 */
export const AuthErrors = {
  UNAUTHORIZED: { error: 'Unauthorized', message: 'Authentication required' },
  FORBIDDEN: { error: 'Forbidden', message: 'Insufficient permissions' },
  BANNED: { error: 'Banned', message: 'Your account has been banned' },
  SUBSCRIPTION_EXPIRED: {
    error: 'Subscription Expired',
    message: 'Your subscription has expired. Please renew to continue.'
  },
} as const;
