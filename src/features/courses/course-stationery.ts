/** Match each folder cover to its calendar notes, independent of list order. */
export function courseTabLabel(category: string) {
  return category.split(" — ")[0].trim();
}

const inks = ["lilac", "sage", "blue", "rose", "peach", "sand", "slate"] as const;

export function courseInk(category: string) {
  let hash = 0;
  for (const char of courseTabLabel(category).toLowerCase()) {
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  }
  return inks[hash % inks.length];
}
