// Cached so the footer can still be prerendered (Cache Components is enabled).
export async function CurrentYear() {
  "use cache";
  return <>{new Date().getFullYear()}</>;
}
