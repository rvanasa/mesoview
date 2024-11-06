import React from 'react';
import 'twin.macro';
import { Button } from './Button';

export interface ToolButtonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ToolButton({ ...rest }: ToolButtonProps) {
  return <Button tw="px-2 py-1 [font-size: 11px]" {...rest}></Button>;
}
