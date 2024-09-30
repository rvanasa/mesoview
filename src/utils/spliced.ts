export default function spliced<T>(
  array: T[],
  index: number,
  count: number,
  ...items: T[]
): T[] {
  const newArray = [...array];
  newArray.splice(index, count, ...items);
  return newArray;
}
