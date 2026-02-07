export const getValidGradient = (gradient?: string): string => {
    // List of common junk values that shouldn't be treated as real gradients
    const isJunk = !gradient ||
        gradient === 'undefined' ||
        gradient === 'null' ||
        gradient.trim() === '' ||
        gradient.length < 10 || // Too short to be a valid gradient
        !gradient.includes('from-');

    if (isJunk) return 'from-purple-500 to-blue-500';

    // If it's too dark (900), lighten it to 700/800 for better visibility in cards
    return gradient!.replace(/-900/g, '-700');
};
