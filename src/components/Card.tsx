import React from 'react';
import 'twin.macro';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function Card({ children, ...rest }: CardProps) {
  return (
    <div tw="bg-white p-4 rounded-lg shadow-md" {...rest}>
      {children}
    </div>
  );
}
