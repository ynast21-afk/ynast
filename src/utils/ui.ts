export const getValidGradient = (gradient?: string): string => {
    // List of common junk values that shouldn't be treated as real gradients
    const isJunk = !gradient ||
        gradient === 'undefined' ||
        gradient === 'null' ||
        gradient.trim() === '' ||
        !gradient.includes('from-');

    return isJunk ? 'from-purple-600 to-blue-600' : gradient!;
};
