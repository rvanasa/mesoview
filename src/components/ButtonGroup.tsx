import React from 'react';
import tw from 'twin.macro';

const Container = tw.div`
    flex
    items-center
    [&>.button]:not-first-of-type:(rounded-l-none border-l-0)
    [&>.button]:not-last-of-type:(rounded-r-none)
`;

export interface ButtonGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function ButtonGroup({ ...rest }: ButtonGroupProps) {
  return <Container {...rest}></Container>;
}
