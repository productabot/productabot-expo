import React, { forwardRef } from 'react';
import { useTheme } from '@react-navigation/native';

export interface Props {
  children: React.ReactNode;
  columns?: number;
  label?: string;
  style?: React.CSSProperties;
  horizontal?: boolean;
  hover?: boolean;
  handleProps?: React.HTMLAttributes<any>;
  scrollable?: boolean;
  shadow?: boolean;
  placeholder?: boolean;
  unstyled?: boolean;
  onClick?(): void;
  onRemove?(): void;
}

export const Container = forwardRef<HTMLDivElement, Props>(
  (
    {
      children,
      columns = 1,
      handleProps,
      horizontal,
      hover,
      onClick,
      onRemove,
      label,
      placeholder,
      style,
      scrollable,
      shadow,
      unstyled,
      heightOffset,
      ...props
    }: Props,
    ref
  ) => {
    const { colors } = useTheme();

    return (
      <div
        {...props}
        /*
        // @ts-ignore */
        ref={ref}
        style={{ width: '100%', height: `calc(100vh - ${heightOffset}px)`, minHeight: `calc(100vh - ${heightOffset}px)`, border: `1px solid ${colors.border}66`, borderLeftWidth: 0.25, borderRightWidth: 0.25 }}
        onClick={onClick}
        tabIndex={onClick ? 0 : undefined}
      >
        {children}
      </div>
    );
  }
);
