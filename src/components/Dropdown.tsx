import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ReactNode } from 'react';
import { FaCaretDown, FaCaretUp } from 'react-icons/fa';
import 'twin.macro';

export interface DropdownProps {
  label: ReactNode;
  anchor: 'top' | 'bottom'; // TODO
  children: ReactNode[];
  noCaret?: boolean;
  className?: string;
}

export default function Dropdown({ label, anchor, children, noCaret, className }: DropdownProps) {
  return (
    <div className={className}>
      <Menu>
        <MenuButton tw="w-full flex items-center gap-2">
          {label}
          {!noCaret && (anchor === 'top' ? <FaCaretUp /> : <FaCaretDown />)}
        </MenuButton>
        <MenuItems
          tw="border-2 rounded-xl bg-[#fffe] dark:bg-gray-800 dark:border-gray-600"
          anchor={anchor}
        >
          {children.map((item, i) => (
            <MenuItem
              key={i}
              as="div"
              tw="cursor-pointer [&>*]:(px-4 py-2) select-none hover:bg-[#0001] dark:hover:bg-gray-700 dark:text-white [transition-duration: .1s]"
            >
              {item}
            </MenuItem>
          ))}
        </MenuItems>
      </Menu>
    </div>
  );
}
