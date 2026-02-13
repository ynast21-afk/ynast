import { MembershipLevel } from '@/contexts/AuthContext';

export const membershipHierarchy: MembershipLevel[] = ['guest', 'basic', 'vip', 'premium'];

/**
 * Checks if a user's membership level meets the required level.
 * @param requiredLevel The minimum membership level required (e.g., 'vip', 'premium').
 * @param userLevel The current user's membership level. Defaults to 'guest'.
 * @returns boolean True if access is granted, false otherwise.
 */
export const hasAccess = (requiredLevel: string | undefined, userLevel: MembershipLevel = 'guest'): boolean => {
    const required = (requiredLevel || 'guest') as MembershipLevel;
    const requiredIndex = membershipHierarchy.indexOf(required);
    const userIndex = membershipHierarchy.indexOf(userLevel);

    // If the required level is not recognized, default to guest access (allow)
    if (requiredIndex === -1) return true;

    return userIndex >= requiredIndex;
};
