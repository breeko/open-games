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
    id: 'kingdom-rush',
    title: 'Kingdom Rush',
    category: 'Tower defense',
    description: 'Hold the roads of Pagras with archers, soldiers, magic and artillery.',
    href: '/games/kingdom-rush/',
    cover: '/games/kingdom-rush/assets/pagras.png',
    detail: 'Pagras · 1 reference level · Touch & mouse',
  },
  {
    id: 'garden-guard',
    title: 'Garden Guard',
    category: 'Tower defense',
    description: 'Grow your defenses. Gather sunlight. Keep the zombies off your lawn.',
    href: '/games/garden-guard/',
    cover: '/games/garden-guard/assets/reference/lawn3.jpg',
    detail: '16 levels · Day & night · Touch & mouse',
  },
];
