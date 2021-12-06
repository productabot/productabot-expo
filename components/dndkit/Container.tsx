import React, { forwardRef } from 'react';

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
      ...props
    }: Props,
    ref
  ) => {
    const Component = onClick ? 'button' : 'div';

    return (
      <Component
        {...props}
        /*
        // @ts-ignore */
        ref={ref}
        style={{ width: 425, height: 'calc(100vh - 130px)', overflowY: 'scroll', overflowX: 'clip', border: '1px solid #333333', borderRadius: 10, margin: 5 }}
        onClick={onClick}
        tabIndex={onClick ? 0 : undefined}
      >
        {children}
      </Component>
    );
  }
);
