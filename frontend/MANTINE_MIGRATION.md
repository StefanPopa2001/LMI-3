# Mantine UI Migration Guide

## Overview

This document describes the migration from Material-UI (MUI) and Tailwind CSS to Mantine UI v7 for the LMI-3 frontend application.

## What Changed

### Removed Dependencies
- ❌ `@mui/material` - Replaced with Mantine
- ❌ `@mui/icons-material` - Replaced with Tabler Icons
- ❌ `@emotion/react` & `@emotion/styled` - No longer needed
- ❌ `tailwindcss` - Removed completely
- ❌ `react-toastify` - Replaced with Mantine Notifications

### Added Dependencies
- ✅ `@mantine/core@^7.15.2` - Core component library
- ✅ `@mantine/hooks@^7.15.2` - Useful React hooks
- ✅ `@mantine/form@^7.15.2` - Form management
- ✅ `@mantine/dates@^7.15.2` - Date picker components
- ✅ `@mantine/notifications@^7.15.2` - Toast notifications
- ✅ `@mantine/modals@^7.15.2` - Modal dialogs
- ✅ `@mantine/dropzone@^7.15.2` - File upload
- ✅ `@mantine/spotlight@^7.15.2` - Command palette
- ✅ `@tabler/icons-react@^3.24.0` - Icon library

## File Structure Changes

### Theme Configuration

**New Files:**
- `/src/theme/mantine-theme.ts` - Mantine theme configuration
- `/src/theme/MantineProvider.tsx` - Provider wrapper with all necessary imports

**Removed Files:**
- `/src/theme/ThemeRegistry.tsx` - No longer needed
- `tailwind.config.js` - Removed
- `postcss.config.mjs` - Removed

### Updated Files

#### `/src/app/layout.tsx`
- Now uses `MantineProvider` instead of MUI's `ThemeRegistry`
- Added `ColorSchemeScript` for proper SSR support
- Removed `ToastContainer` (now handled by Mantine)

#### `/src/app/globals.css`
- Cleaned up and simplified
- Removed Tailwind utilities
- Kept only essential global styles and animations

#### `/src/views/LoginView.tsx`
- Complete rewrite using Mantine components
- Uses `notifications` from `@mantine/notifications` instead of toast
- Cleaner, more modern UI with gradient background

#### `/src/views/DashboardView.tsx`
- Refactored to use Mantine layout components
- Now wrapped with `NavBarLayout` for consistent navigation
- Uses Tabler icons instead of Material icons

#### `/src/components/layout/NavBar.tsx`
- Complete redesign using Mantine's `AppShell` component
- Responsive sidebar navigation
- User profile display in sidebar
- Better mobile experience

#### `/src/ui/organisms/DashboardFeatureCard.tsx`
- Rebuilt with Mantine `Card` and `ThemeIcon`
- Smooth hover animations
- Better accessibility

## Component Migration Guide

### Common Replacements

| MUI Component | Mantine Component | Notes |
|--------------|------------------|-------|
| `Box` | `Box` | Similar API |
| `Container` | `Container` | Similar API |
| `Typography` | `Text`, `Title` | Use `Text` for body, `Title` for headings |
| `TextField` | `TextInput` | Simplified props |
| `Button` | `Button` | Similar API |
| `Card` | `Card` | More flexible |
| `AppBar` | `AppShell.Header` | Part of AppShell |
| `Dialog` | `Modal` | Cleaner API |
| `CircularProgress` | `Loader` | Multiple variants |
| `Stack` | `Stack` | Same purpose |
| `Grid` | `SimpleGrid`, `Grid` | Two variants |

### Icon Migration

MUI Icons → Tabler Icons

```tsx
// Before (MUI)
import { Email as EmailIcon } from '@mui/icons-material';
<EmailIcon />

// After (Mantine)
import { IconMail } from '@tabler/icons-react';
<IconMail size={18} />
```

### Notification Migration

```tsx
// Before (react-toastify)
import { toast } from 'react-toastify';
toast.error('Error message');

// After (Mantine)
import { notifications } from '@mantine/notifications';
notifications.show({
  title: 'Error',
  message: 'Error message',
  color: 'red',
});
```

## Theme Customization

The theme is configured in `/src/theme/mantine-theme.ts`:

```typescript
export const mantineTheme = createTheme({
  primaryColor: 'blue',
  primaryShade: { light: 6, dark: 7 },
  fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif',
  // ... more configuration
});
```

### Custom Colors

The theme includes custom color palettes that match the original design:
- Primary: Blue shades (`#2196f3` family)
- Secondary: Pink shades (`#e91e63` family)

## Layout System

### AppShell

Mantine's `AppShell` provides a comprehensive layout solution:

```tsx
<AppShell
  header={{ height: 60 }}
  navbar={{
    width: 300,
    breakpoint: 'sm',
    collapsed: { mobile: !opened },
  }}
>
  <AppShell.Header>{/* Header content */}</AppShell.Header>
  <AppShell.Navbar>{/* Navigation */}</AppShell.Navbar>
  <AppShell.Main>{/* Page content */}</AppShell.Main>
</AppShell>
```

## Styling Approach

### No More Tailwind

Instead of Tailwind classes, use Mantine's `style` prop or inline styles:

```tsx
// Before
<div className="flex items-center justify-center p-4 bg-blue-500">

// After
<Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--mantine-spacing-md)', backgroundColor: 'var(--mantine-color-blue-5)' }}>
```

### Responsive Design

Mantine uses object notation for responsive props:

```tsx
<SimpleGrid
  cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
  spacing="lg"
>
```

## Benefits of Mantine

1. **Better TypeScript Support** - Fully typed components
2. **Smaller Bundle Size** - More tree-shakeable than MUI
3. **Modern Design** - Contemporary UI patterns
4. **Better Accessibility** - ARIA attributes out of the box
5. **Comprehensive Hooks** - Useful utilities included
6. **Excellent Documentation** - Clear examples and guides
7. **No Emotion/styled-components** - Simpler styling approach

## Migration Checklist for Remaining Pages

When migrating other pages, follow these steps:

- [ ] Replace MUI imports with Mantine imports
- [ ] Replace MUI icons with Tabler icons
- [ ] Update `toast` calls to `notifications.show()`
- [ ] Convert `sx` props to `style` props
- [ ] Update responsive breakpoint syntax
- [ ] Wrap pages with `NavBarLayout` if needed
- [ ] Test on mobile and desktop
- [ ] Check dark mode appearance

## Common Patterns

### Form Input

```tsx
<TextInput
  label="Email"
  placeholder="your@email.com"
  type="email"
  required
  leftSection={<IconMail size={18} />}
  error={errorMessage}
/>
```

### Password Input

```tsx
<PasswordInput
  label="Password"
  required
  leftSection={<IconLock size={18} />}
/>
```

### Buttons

```tsx
<Button
  variant="filled" // or 'light', 'outline', 'subtle'
  color="blue"
  size="md"
  leftSection={<IconCheck size={18} />}
  loading={isLoading}
>
  Submit
</Button>
```

### Cards

```tsx
<Card shadow="sm" padding="lg" radius="md" withBorder>
  <Text fw={500}>Card Title</Text>
  <Text size="sm" c="dimmed">Card content</Text>
</Card>
```

### Modals

```tsx
<Modal
  opened={opened}
  onClose={close}
  title="Modal Title"
  centered
>
  {/* Modal content */}
</Modal>
```

## Resources

- [Mantine Documentation](https://mantine.dev/)
- [Mantine Components](https://mantine.dev/core/app-shell/)
- [Tabler Icons](https://tabler.io/icons)
- [Mantine Hooks](https://mantine.dev/hooks/use-disclosure/)

## Next Steps

The following pages still need to be migrated:
- `/src/app/users/*` - User management pages
- `/src/app/classes/*` - Class management
- `/src/app/attendance/*` - Attendance tracking
- `/src/app/rr/*` - Replacement requests
- `/src/app/drive/*` - File management
- `/src/app/stats/*` - Statistics and analytics
- `/src/app/settings/*` - Settings pages
- All other feature pages

## Support

For questions about Mantine components or migration issues:
1. Check the [Mantine documentation](https://mantine.dev/)
2. Review existing migrated components for patterns
3. Consult this migration guide

---

**Migration Date:** 2025-10-10
**Migrated By:** GitHub Copilot
**Mantine Version:** 7.15.2
