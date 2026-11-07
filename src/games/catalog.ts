/** Library metadata only: never import a game implementation into this catalog. */
export interface GameListing {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly description: string;
  readonly href: `/games/${string}/`;
  readonly cover: `/games/${string}`;
  readonly detail: string;
}

export const GAMES: readonly GameListing[] = [
  {
    id: 'garden-guard',
    title: 'Garden Guard',
    category: 'Tower defense',
    description: 'Grow your defenses. Gather sunlight. Keep the zombies off your lawn.',
    href: '/games/garden-guard/',
    cover: '/games/garden-guard/assets/reference/lawn3.jpg',
    detail: '14 levels · Day & night · Touch & mouse',
  },
];
