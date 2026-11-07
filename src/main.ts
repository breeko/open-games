import { GAMES } from './games/catalog';
import './library.css';

const categories = document.querySelector<HTMLElement>('#categories')!;
const list = document.querySelector<HTMLElement>('#game-list')!;
const count = document.querySelector<HTMLElement>('#game-count')!;

function showCategory(category: string): void {
  const games = GAMES.filter(game => category === 'All games' || game.category === category);
  count.textContent = `${games.length} ${games.length === 1 ? 'game' : 'games'}`;
  categories.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed',String(button.textContent === category)));
  list.replaceChildren(...games.map(game => {
    const card = document.createElement('a');
    card.className = 'game-card';
    card.href = game.href;
    const art = document.createElement('div');
    art.className = 'game-cover';
    const image = document.createElement('img');
    image.src = game.cover;
    image.alt = '';
    image.width = 1280;
    image.height = 960;
    const badge = document.createElement('span');
    badge.className = 'category-badge';
    badge.textContent = game.category;
    const play = document.createElement('span');
    play.className = 'play-badge';
    play.textContent = 'Play game ↗';
    art.append(image,badge,play);
    const body = document.createElement('div');
    body.className = 'game-info';
    const title = document.createElement('h3');
    title.textContent = game.title;
    const description = document.createElement('p');
    description.textContent = game.description;
    const detail = document.createElement('span');
    detail.className = 'game-detail';
    detail.textContent = game.detail;
    art.append(title);
    body.append(description,detail);
    card.append(art,body);
    return card;
  }));
}
for (const category of ['All games',...new Set(GAMES.map(game => game.category))]) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = category;
  button.onclick = () => showCategory(category);
  categories.append(button);
}
showCategory('All games');
