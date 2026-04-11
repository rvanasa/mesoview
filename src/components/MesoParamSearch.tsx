import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import 'twin.macro';
import { mesoParamCategories } from '../utils/mesoanalysis';

export interface MesoParamSearchProps {
  onSelect: (paramKey: string) => void;
}

export default function MesoParamSearch({ onSelect }: MesoParamSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    },
    [],
  );

  // Filter parameters based on search query
  const filteredResults = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      return [];
    }

    const query = trimmedQuery.toLowerCase();
    const results: Array<{
      paramKey: string;
      paramTitle: string;
      category: string;
    }> = [];

    for (const [category, params] of mesoParamCategories) {
      for (const [paramKey, paramTitle] of params) {
        if (
          paramTitle.toLowerCase().includes(query) ||
          paramKey.toLowerCase().includes(query) ||
          category.toLowerCase().includes(query)
        ) {
          results.push({ paramKey, paramTitle, category });
        }
      }
    }

    return results;
  }, [searchQuery]);

  const handleSelectParam = useCallback(
    (paramKey: string) => {
      onSelect(paramKey);
      setSearchQuery('');
    },
    [onSelect],
  );

  return (
    <div tw="w-full">
      <div tw="relative px-2 py-2 border-b dark:border-gray-600">
        <div tw="flex items-center gap-2 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-500">
          <FaSearch tw="text-gray-400" />
          <input
            tw="flex-1 bg-transparent outline-none text-sm dark:text-white"
            type="text"
            placeholder="Search parameters..."
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
          />
        </div>
      </div>

      {searchQuery && (
        <div tw="max-h-[300px] overflow-y-auto">
          {filteredResults.length > 0 ? (
            filteredResults.map(({ paramKey, paramTitle, category }) => (
              <div
                key={paramKey}
                tw="cursor-pointer px-4 py-2 select-none hover:bg-[#0001] dark:hover:bg-gray-700 dark:text-white [transition-duration: .1s]"
                onClick={() => handleSelectParam(paramKey)}
              >
                <div tw="font-medium">{paramTitle}</div>
                <div tw="text-xs text-gray-500 dark:text-gray-400">
                  {category}
                </div>
              </div>
            ))
          ) : (
            <div tw="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              No parameters found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
