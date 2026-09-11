export function parseUsername(input: string): string | null {
  const value = input.trim().replace(/^@/, "");
  return /^[A-Za-z0-9_](?:[A-Za-z0-9_.]{0,22}[A-Za-z0-9_])?$/.test(value)
    ? value.toLowerCase()
    : null;
}
