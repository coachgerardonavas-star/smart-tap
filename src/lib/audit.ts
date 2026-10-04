export function changedFieldNames(
  current: Record<string, unknown>,
  next: Record<string, unknown>,
): string[] {
  return Object.keys(next).filter((field) => current[field] !== next[field]);
}
