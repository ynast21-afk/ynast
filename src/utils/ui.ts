/**
 * Returns a valid Tailwind gradient class string.
 * Uses literal strings to prevent Tailwind CSS purging.
 */
export const getValidGradient = (gradient?: string): string => {
    // List of common junk values that shouldn't be treated as real gradients
    const isJunk = !gradient ||
        gradient === 'undefined' ||
        gradient === 'null' ||
        gradient.trim() === '' ||
        gradient.length < 10 ||
        !gradient.includes('from-');

    if (isJunk) return 'from-purple-500 to-pink-500';

    // Map of common dark gradients to brighter versions to ensure visibility
    const gradientMap: Record<string, string> = {
        'from-pink-900 to-purple-900': 'from-pink-600 to-purple-600',
        'from-blue-900 to-indigo-900': 'from-blue-600 to-indigo-600',
        'from-cyan-900 to-teal-900': 'from-cyan-600 to-teal-600',
        'from-amber-900 to-orange-900': 'from-amber-600 to-orange-600',
        'from-rose-900 to-pink-900': 'from-rose-600 to-pink-600',
        'from-violet-900 to-purple-900': 'from-violet-600 to-purple-600',
        'from-emerald-900 to-green-900': 'from-emerald-600 to-green-600',
        'from-slate-900 to-gray-900': 'from-slate-600 to-gray-600',
        'from-orange-900 to-red-900': 'from-orange-600 to-red-600',
        'from-teal-900 to-cyan-900': 'from-teal-600 to-cyan-600',
        'from-fuchsia-900 to-pink-900': 'from-fuchsia-600 to-pink-600',
        'from-indigo-900 to-blue-900': 'from-indigo-600 to-blue-600',
    };

    return gradientMap[gradient!] || gradient!;
};
