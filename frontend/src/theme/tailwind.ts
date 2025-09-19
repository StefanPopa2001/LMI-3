// Tailwind-compatible class mappings (extracted from old ThemeRegistry)
export const tailwindColors = {
  bg: {
    primary: 'bg-gray-900',
    secondary: 'bg-gray-800',
    tertiary: 'bg-gray-700',
    accent: 'bg-blue-900',
    hover: 'hover:bg-gray-700',
  },
  text: {
    primary: 'text-white',
    secondary: 'text-gray-300',
    tertiary: 'text-gray-400',
    accent: 'text-blue-400',
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
  },
  border: {
    primary: 'border-gray-600',
    secondary: 'border-gray-500',
    accent: 'border-blue-500',
  },
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  },
  card: {
    background: 'bg-gray-800 border border-gray-700',
    hover: 'hover:bg-gray-700 hover:border-gray-600',
  },
  form: {
    input: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400',
    focus: 'focus:border-blue-500 focus:ring-blue-500',
  },
};

export const getTailwindClasses = (
  component: keyof typeof tailwindColors,
  variant?: string
): string => {
  const componentClasses = tailwindColors[component] as any;
  if (typeof componentClasses === 'string') return componentClasses;
  if (variant && componentClasses[variant]) return componentClasses[variant];
  return '';
};

export type TailwindColors = typeof tailwindColors;
