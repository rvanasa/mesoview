import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { FaCaretDown, FaCaretUp, FaChevronLeft } from 'react-icons/fa';
import 'twin.macro';

export interface MultiStepItem {
  label: string;
  // If submenu is provided, clicking navigates to that submenu
  submenu?: MultiStepItem[];
  // If onClick is provided, clicking triggers the action and closes menu
  onClick?: () => void;
}

export interface MultiStepDropdownProps {
  label: ReactNode;
  anchor: 'top' | 'bottom';
  items: MultiStepItem[];
  // Optional initial path (array of indices) to start at a specific submenu
  initialPath?: number[];
}

export default function MultiStepDropdown({
  label,
  anchor,
  items,
  initialPath = [],
}: MultiStepDropdownProps) {
  const [path, setPath] = useState<number[]>(initialPath);
  const initialPathRef = useRef(initialPath);

  // Update path when initialPath changes (when switching between different views)
  useEffect(() => {
    initialPathRef.current = initialPath;
  }, [initialPath]);

  // Navigate to the current menu level based on path
  const getCurrentItems = (): MultiStepItem[] => {
    let current = items;
    for (const index of path) {
      if (current[index]?.submenu) {
        current = current[index].submenu!;
      } else {
        // Invalid path, reset to root
        setPath([]);
        return items;
      }
    }
    return current;
  };

  const currentItems = getCurrentItems();
  const isAtRoot = path.length === 0;

  const handleItemClick = (item: MultiStepItem, index: number) => {
    if (item.submenu) {
      // Navigate into submenu
      setPath([...path, index]);
    } else if (item.onClick) {
      // Execute action
      item.onClick();
      // Reset to initial path for next open
      setPath(initialPath);
    }
  };

  const handleBack = () => {
    setPath(path.slice(0, -1));
  };

  const handleMenuOpen = () => {
    // Reset to initial path when menu opens
    setPath(initialPathRef.current);
  };

  return (
    <Menu>
      {({ close }) => (
        <>
          <MenuButton tw="flex items-center gap-2" onClick={handleMenuOpen}>
            {label}
            {anchor === 'top' ? <FaCaretUp /> : <FaCaretDown />}
          </MenuButton>
          <MenuItems
            tw="border-2 rounded-xl bg-[#fffe] dark:bg-gray-800 dark:border-gray-600"
            anchor={anchor}
          >
            {!isAtRoot && (
              <MenuItem
                as="div"
                tw="cursor-pointer px-4 py-2 select-none hover:bg-[#0001] dark:hover:bg-gray-700 dark:text-white [transition-duration: .1s] flex items-center gap-2 border-b dark:border-gray-600"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBack();
                }}
              >
                <FaChevronLeft />
                Back
              </MenuItem>
            )}
            {currentItems.map((item, i) => (
              <MenuItem
                key={i}
                as="div"
                tw="cursor-pointer px-4 py-2 select-none hover:bg-[#0001] dark:hover:bg-gray-700 dark:text-white [transition-duration: .1s]"
                onClick={(e) => {
                  if (item.submenu) {
                    // Prevent menu from closing when navigating to submenu
                    e.preventDefault();
                    e.stopPropagation();
                  }
                  handleItemClick(item, i);
                  // Only close if it's an action item (not a submenu)
                  if (!item.submenu) {
                    close();
                  }
                }}
              >
                {item.label}
              </MenuItem>
            ))}
          </MenuItems>
        </>
      )}
    </Menu>
  );
}
