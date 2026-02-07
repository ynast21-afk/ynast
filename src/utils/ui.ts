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

    // Map of common gradients to brighter/guaranteed variants to ensure visibility
    const gradientMap: Record<string, string> = {
        // -900 variants -> -500/600
        'from-pink-900 to-purple-900': 'from-pink-500 to-purple-500',
        'from-blue-900 to-indigo-900': 'from-blue-500 to-indigo-500',
        'from-cyan-900 to-teal-900': 'from-cyan-500 to-teal-500',
        'from-rose-900 to-pink-900': 'from-rose-500 to-pink-500',
        'from-violet-900 to-purple-900': 'from-violet-500 to-purple-500',

        // -700 variants (from initialData) -> -500/600 for better pop
        'from-pink-700 to-purple-700': 'from-pink-500 to-purple-500',
        'from-purple-700 to-pink-700': 'from-purple-500 to-pink-500',
        'from-blue-700 to-indigo-700': 'from-blue-500 to-indigo-500',
        'from-indigo-700 to-blue-700': 'from-indigo-500 to-blue-500',
        'from-cyan-700 to-teal-700': 'from-cyan-500 to-teal-500',
        'from-teal-700 to-cyan-700': 'from-teal-500 to-cyan-500',
        'from-amber-700 to-orange-700': 'from-amber-500 to-orange-500',
        'from-orange-700 to-amber-700': 'from-orange-500 to-amber-500',
        'from-rose-700 to-pink-700': 'from-rose-500 to-pink-500',
        'from-violet-700 to-purple-700': 'from-violet-500 to-purple-500',
        'from-emerald-700 to-green-700': 'from-emerald-500 to-green-500',
        'from-slate-700 to-gray-700': 'from-slate-500 to-gray-500',
        'from-orange-700 to-red-700': 'from-orange-500 to-red-500',
        'from-fuchsia-700 to-pink-700': 'from-fuchsia-500 to-pink-500',
    };

    return gradientMap[gradient!] || gradient!;
};
