import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Swiss International Style Button Component
 *
 * Design Principles:
 * - Hard shadows (no blur) that create depth
 * - Square corners (rounded-none) - Brutalist aesthetic
 * - High contrast black borders
 * - Hover: translate + shadow removal creates "press" effect
 * - Clear semantic variants for different actions
 */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual variant determining color and purpose:
   * - `default`: Hyper Blue (#1D4ED8) - Primary actions (save, submit, create)
   * - `destructive`: Alert Red (#DC2626) - Destructive actions (delete, remove)
   * - `success`: Signal Green (#15803D) - Positive actions (download, confirm, complete)
   * - `warning`: Alert Orange (#F97316) - Caution actions (reset, clear, undo)
   * - `outline`: Transparent + black border - Secondary actions (cancel, back)
   * - `secondary`: Panel Grey (#E5E5E0) - Tertiary actions
   * - `ghost`: No background - Subtle actions (icon buttons, navigation)
   * - `link`: Text only with underline - Inline links
   */
  variant?:
    | 'default'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  /**
   * Button size:
   * - `default`: Standard button (h-10)
   * - `sm`: Small button (h-8)
   * - `lg`: Large button (h-12)
   * - `icon`: Square icon button (h-9 w-9)
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    // Base styles applied to ALL buttons
    const baseStyles = cn(
      // Layout & Typography
      'relative inline-flex items-center justify-center gap-2',
      'whitespace-nowrap text-sm font-semibold tracking-wide',
      // Transitions
      'transition-all duration-200 ease-out',
      // Focus state
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
      // Disabled state
      'disabled:pointer-events-none disabled:opacity-50',
      // SVG icon sizing
      "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
      // Bento Design: Rounded corners
      'rounded-xl'
    );

    // Hit-area expansion for icon-only buttons. Many call sites override
    // size="icon" with smaller h-X w-X classes for dense toolbars (h-8 w-8,
    // h-7 w-7, etc.) — those visible sizes are under WCAG 2.5.8's 44×44 target
    // size minimum. The ::before pseudo-element extends the touch area by 6px
    // on each side without affecting visible layout, so a 32×32 button gets a
    // 44×44 touch target. For h-7 and smaller, the touch area still falls
    // short — those need an additional inline override at the call site
    // (e.g. before:-inset-[10px]).
    const iconHitArea = "before:absolute before:-inset-1.5 before:content-['']";

    // Variant styles - each has distinct purpose and color
    const variants = {
      // PRIMARY
      default: cn(
        'bg-zinc-100 text-zinc-900',
        'shadow-[0_0_15px_rgba(255,255,255,0.1)]',
        'hover:bg-white',
        'active:scale-[0.98]'
      ),

      // DESTRUCTIVE
      destructive: cn(
        'bg-red-500/10 text-red-500',
        'border border-red-500/20',
        'hover:bg-red-500/20 hover:border-red-500/30',
        'active:scale-[0.98]'
      ),

      // SUCCESS
      success: cn(
        'bg-emerald-500/10 text-emerald-500',
        'border border-emerald-500/20',
        'hover:bg-emerald-500/20 hover:border-emerald-500/30',
        'active:scale-[0.98]'
      ),

      // WARNING
      warning: cn(
        'bg-amber-500/10 text-amber-500',
        'border border-amber-500/20',
        'hover:bg-amber-500/20 hover:border-amber-500/30',
        'active:scale-[0.98]'
      ),

      // OUTLINE
      outline: cn(
        'bg-zinc-900/50 text-zinc-300',
        'border border-white/10',
        'hover:bg-zinc-800/50 hover:text-zinc-100',
        'active:scale-[0.98]'
      ),

      // SECONDARY
      secondary: cn(
        'bg-zinc-800 text-zinc-200',
        'hover:bg-zinc-700 hover:text-zinc-100',
        'active:scale-[0.98]'
      ),

      // GHOST
      ghost: cn(
        'bg-transparent text-zinc-400',
        'hover:bg-zinc-800/50 hover:text-zinc-200',
        'active:scale-[0.98]'
      ),

      // LINK
      link: cn(
        'bg-transparent text-zinc-400',
        'hover:text-zinc-200 hover:underline underline-offset-4',
        'p-0 h-auto rounded-none'
      ),
    };

    // Size styles. Icon variant is 44×44px to meet WCAG 2.2 AA target size
    // (success criterion 2.5.8). Call sites that override the visible size
    // with smaller h-X w-X classes get the touch-area expansion via the
    // iconHitArea overlay above.
    const sizes = {
      default: 'h-10 px-6 py-2',
      sm: 'h-8 px-4 py-1 text-xs',
      lg: 'h-12 px-8 py-3 text-base',
      icon: cn('h-11 w-11 p-0', iconHitArea),
    };

    const variantClass = variants[variant];
    const sizeClass = sizes[size];

    return (
      <button ref={ref} className={cn(baseStyles, variantClass, sizeClass, className)} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button };
