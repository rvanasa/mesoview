import React from 'react';
import 'twin.macro';

export interface PrimaryButtonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function PrimaryButton({ ...rest }: PrimaryButtonProps) {
  return (
    <div
      tw="p-2 bg-blue-500 text-white rounded-lg text-center cursor-pointer hover:(bg-blue-600) [transition-duration: .1s]"
      {...rest}
    ></div>
  );
}
