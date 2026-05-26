import React from 'react';

interface GroupedListProps<T> {
  items: T[];
  groupBy: ((item: T) => string) | null;
  sortItems: (a: T, b: T) => number;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderSubheading: (groupKey: string, count: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
}

export function GroupedList<T>({
  items,
  groupBy,
  sortItems,
  renderItem,
  renderSubheading,
  keyExtractor,
}: GroupedListProps<T>): React.ReactElement | null {
  const sorted = [...items].sort(sortItems);

  if (!groupBy) {
    return (
      <>
        {sorted.map((item, i) => (
          <React.Fragment key={keyExtractor(item)}>{renderItem(item, i)}</React.Fragment>
        ))}
      </>
    );
  }

  const groups: { key: string; items: T[] }[] = [];
  const seen = new Map<string, T[]>();

  for (const item of sorted) {
    const key = groupBy(item);
    if (!seen.has(key)) {
      const arr: T[] = [];
      seen.set(key, arr);
      groups.push({ key, items: arr });
    }
    seen.get(key)!.push(item);
  }

  return (
    <>
      {groups.map(({ key, items: groupItems }) => (
        <React.Fragment key={key}>
          {renderSubheading(key, groupItems.length)}
          {groupItems.map((item, i) => (
            <React.Fragment key={keyExtractor(item)}>{renderItem(item, i)}</React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </>
  );
}
