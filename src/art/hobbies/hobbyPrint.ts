const prints = import.meta.glob<string>('./prints/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
});

export function hobbyPrint(playerId: string): string | undefined {
  return prints['./prints/' + playerId + '.webp'];
}
