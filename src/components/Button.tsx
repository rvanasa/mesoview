import classNames from 'classnames';
import React from 'react';
import tw from 'twin.macro';

export interface ButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'primary' | undefined;
}

const Container = tw.div`
  px-4
  py-2
  border-[1px]
  border-gray-200
  text-lg
  text-[rgba(0,0,0,.9)]
  flex
  justify-center
  items-center
  rounded-lg
  shadow-sm
  [transition-duration: .1s]
  cursor-pointer
  select-none
  
  hover:(bg-gray-100)
`;

export function Button({ className, type, ...rest }: ButtonProps) {
  return (
    <Container
      className={classNames('button', className)}
      css={[
        type === 'primary' && tw`bg-blue-500 text-white hover:(bg-blue-600)`,
      ]}
      {...rest}
    ></Container>
  );
}
