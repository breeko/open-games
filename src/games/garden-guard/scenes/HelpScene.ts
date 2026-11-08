import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { Button } from '../ui/Button';

const SECTIONS: Array<{ heading: string; lines: string[] }> = [
  { heading: 'Twenty-two day, night and pool levels', lines: [
    'Start with one lane and a Peashooter. Later levels open six lanes and new plants.',
    'Use the level menu or arrows to jump backward and forward. Each cleared level saves separately.',
    'Relaxed, Baseline and Hard change enemy strength. Changing difficulty restarts the level.',
  ]},
  { heading: 'Touch controls', lines: [
    'Tap a seed, then a lawn square. Dragging also works.',
    'Tap golden suns to collect sun (small Sun-shroom suns give 15). Seed cards show their cost and recharge.',
    'Shovel removes a plant without a refund. Cancel seed clears your selection.',
    'Menu stops gameplay. Space opens/closes it. Auto-pause on focus loss is optional.',
  ]},
  { heading: 'Build a defense', lines: [
    'Sunflowers make 25 sun about every 24 seconds. Plant them early.',
    'Wall-nuts buy time. Potato Mines need 15 seconds to arm.',
    'Pole vaulters jump the first plant, then slow down. Snow Peas slow enemies.',
    'Chompers swallow one zombie, then digest for 42 seconds. Repeaters shoot twice.',
  ]},
  { heading: 'Special rounds', lines: [
    '1-5: Wall-nut Bowling. Launch from the first three columns. Nuts roll and bounce between lanes.',
    '1-10: Conveyor defense. Plants arrive over time, cost no sun, and are limited by supply.',
    '2-1 to 2-4: No sky sun. Use free Puff-shrooms and sun producers. Clear graves before the final wave.',
    'A mower can rescue each lane once. A second breach ends the level.',
    '2-7 / 2-8: Keep Scaredy-shrooms in back. Ice-shrooms freeze enemies; dancers replace lost backups.',
    '2-9 / 2-10: Doom-shrooms leave a three-minute crater. The night finale supplies mushrooms for free.',
    '3-1 / 3-2: Plant Lily Pads before water defenders. Squash crushes once. Water mowers sink near the edge.',
    'Waves can overlap. Keep building before the final flag!',
  ]},
];

/** Static help screen. Purely informational, with a Back button. */
export class HelpScene extends Phaser.Scene {
  constructor() {
    super('help');
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
    });
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x101c0d)
      .setOrigin(0, 0)
      .setDepth(DEPTH.lawn);

    this.add
      .text(GAME_WIDTH / 2, 56, 'HOW TO PLAY', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '40px',
        color: '#ffe066',
        stroke: '#2b2016',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    const columnWidth = 560;
    const leftX = 70;
    const rightX = GAME_WIDTH / 2 + 30;

    SECTIONS.forEach((section, i) => {
      const x = i % 2 === 0 ? leftX : rightX;
      const y = 130 + Math.floor(i / 2) * 250;

      this.add
        .text(x, y, section.heading, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
          color: '#9ff07a',
          fontStyle: 'bold',
        })
        .setDepth(DEPTH.ui);

      this.add
        .text(x, y + 42, section.lines.map((line) => `\u2022  ${line}`).join('\n'), {
          fontFamily: 'Arial, sans-serif',
          fontSize: '17px',
          color: '#e8f5e0',
          wordWrap: { width: columnWidth },
          lineSpacing: 9,
        })
        .setDepth(DEPTH.ui);
    });

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 52, {
      label: '\u25c0   Back to Menu',
      width: 300,
      height: 50,
      fontSize: 20,
      onClick: () => this.goBack(),
    });

    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
    this.input.keyboard?.on('keydown-BACKSPACE', () => this.goBack());

    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  private goBack(): void {
    audio.sfx('click');
    this.cameras.main.fadeOut(150, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('menu');
    });
  }
}
