import Phaser from 'phaser';
import { DEPTH } from '../constants';

/** Loads original reference art, with generated fallback gameplay textures. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload(): void {
    for(const name of ['BG_Left','BG_Center','BG_Right','WoodSign1','Adventure_button','Adventure_highlight','Cloud1','Cloud2','Cloud4','Almanac','AlmanacHighlight','Options1','Options2','Help1','Help2','Quit1','Quit2']) {
      this.load.image('menu-'+name,'/games/garden-guard/assets/menu/SelectorScreen_'+name+'.png');
    }
    this.load.image('menu-sky','/games/garden-guard/assets/menu/SelectorScreen_BG.jpg');
    for (const key of ['threepeater','lilypad','squash','zombie-swim','zombie-swim-cone','zombie-swim-bucket','peashooter','sunflower','wallnut','wallnut-cracked','wallnut-broken','cherrybomb','potatomine','potatomine-armed','snowpea','repeater','chomper','chomper-digest','zombie','zombie-cone','zombie-bucket','zombie-pole','zombie-pole-walk','pea','icepea','sun','mower','puff','puffshroom','sunshroom','sunshroom-grown','fumeshroom','gravebuster','zombie-paper','zombie-paper-angry','zombie-door','hypnoshroom','scaredyshroom','scaredyshroom-hidden','zombie-football','zombie-football-bare','iceshroom','doomshroom','zombie-dancer','zombie-backup']) {
      this.load.image('reference-' + key, '/games/garden-guard/assets/reference/' + key + '.png');
    }
    this.load.image('pool','/games/garden-guard/assets/reference/pool.png');
    this.load.image('night','/games/garden-guard/assets/reference/background2.png');
    for(const key of ['grave','plant-shadow','crater','ice-front','ice-back'])this.load.image(key,'/games/garden-guard/assets/reference/'+key+'.png');
    for (const n of [1,2,3]) this.load.image('lawn' + n, '/games/garden-guard/assets/reference/lawn' + n + '.png');
    this.load.image('seed-packet', '/games/garden-guard/assets/reference/SeedPacket_Larger.png');
    this.load.image('seed-bank', '/games/garden-guard/assets/reference/SeedBank.png');
    for(const key of ['SunBank','FlagMeter','FlagMeterParts','FlagMeterLevelProgress','ShovelBank','Shovel_hi_res','button_left','button_middle','button_right'])this.load.image(key,'/games/garden-guard/assets/reference/'+key+'.png');
    // --- Load real assets here, e.g. -----------------------------------------
    // this.load.setPath('assets/images');
    // this.load.atlas('plants', 'plants.png', 'plants.json');
    // -------------------------------------------------------------------------
  }

  create(): void {
    this.createTextures();
    for (const key of ['threepeater','lilypad','squash','zombie-swim','zombie-swim-cone','zombie-swim-bucket','peashooter','sunflower','wallnut','wallnut-cracked','wallnut-broken','cherrybomb','potatomine','potatomine-armed','snowpea','repeater','chomper','chomper-digest','zombie','zombie-cone','zombie-bucket','zombie-pole','zombie-pole-walk','pea','icepea','sun','mower','puff','puffshroom','sunshroom','sunshroom-grown','fumeshroom','gravebuster','zombie-paper','zombie-paper-angry','zombie-door','hypnoshroom','scaredyshroom','scaredyshroom-hidden','zombie-football','zombie-football-bare','iceshroom','doomshroom','zombie-dancer','zombie-backup']) {
      if (!this.textures.exists('reference-' + key)) continue;
      if (this.textures.exists(key)) this.textures.remove(key);
      this.textures.renameTexture('reference-' + key, key);
    }
    this.scene.start('menu');
  }

  private createTextures(): void {
    const g = this.add.graphics();
    g.setDepth(DEPTH.lawn - 1);

    /* --- Peashooter ------------------------------------------------------- */
    g.clear();
    g.fillStyle(0x2f8f2f, 1);
    g.fillRect(28, 30, 8, 32); // stem
    g.fillStyle(0x35a035, 1);
    g.fillEllipse(22, 52, 24, 12); // leaf
    g.fillStyle(0x49b449, 1);
    g.fillCircle(32, 24, 17); // head
    g.fillStyle(0x2f8f2f, 1);
    g.fillCircle(47, 21, 8); // muzzle
    g.fillStyle(0x1f6b1f, 1);
    g.fillCircle(29, 19, 4); // eye
    g.generateTexture('peashooter', 64, 64);

    /* --- Sunflower -------------------------------------------------------- */
    g.clear();
    g.fillStyle(0x2f8f2f, 1);
    g.fillRect(28, 30, 8, 32);
    g.fillStyle(0x35a035, 1);
    g.fillEllipse(22, 54, 24, 12);
    g.fillStyle(0xffd93b, 1);
    g.fillCircle(32, 24, 20); // petals
    g.fillStyle(0xffec8a, 1);
    g.fillCircle(32, 24, 14);
    g.fillStyle(0x7a4a1e, 1);
    g.fillCircle(32, 24, 8); // centre
    g.generateTexture('sunflower', 64, 64);

    /* --- Zombies (plain, cone-head, bucket-head) -------------------------- */
    const drawZombie = (headgear?: 'cone' | 'bucket'): void => {
      g.clear();

      // Legs, torso and the outstretched arm.
      g.fillStyle(0x2b3b52, 1);
      g.fillRect(16, 52, 9, 18);
      g.fillRect(31, 52, 9, 18);
      g.fillStyle(0x54606b, 1);
      g.fillRect(13, 28, 30, 27);
      g.fillStyle(0x6d7d8a, 1);
      g.fillRect(2, 32, 14, 8);

      // Head.
      g.fillStyle(0x9fbf8f, 1);
      g.fillCircle(28, 20, 15);

      if (headgear === 'cone') {
        g.fillStyle(0xd9641f, 1);
        g.fillTriangle(28, 0, 15, 17, 41, 17);
        g.fillStyle(0xf08a3c, 1);
        g.fillTriangle(28, 4, 22, 16, 34, 16);
      } else if (headgear === 'bucket') {
        g.fillStyle(0x9aa3a8, 1);
        g.fillRoundedRect(14, 1, 28, 14, 3);
        g.fillStyle(0xc2cbd0, 1);
        g.fillRect(15, 4, 6, 9);
        g.fillStyle(0x76818a, 1);
        g.fillRect(11, 13, 34, 5);
      }

      // Face, always drawn last so it stays readable under the headgear.
      g.fillStyle(0x1a1a1a, 1);
      g.fillCircle(23, 19, 3);
      g.fillCircle(33, 19, 3);
      g.fillStyle(0xc23a3a, 1);
      g.fillCircle(23, 19, 1.5);
      g.fillCircle(33, 19, 1.5);
      g.fillStyle(0x3b2a2a, 1);
      g.fillRect(22, 27, 12, 3);
    };

    drawZombie();
    g.generateTexture('zombie', 56, 74);
    drawZombie('cone');
    g.generateTexture('zombie-cone', 56, 74);
    drawZombie('bucket');
    g.generateTexture('zombie-bucket', 56, 74);

    /* --- Pea -------------------------------------------------------------- */
    g.clear();
    g.fillStyle(0x8fe06a, 1);
    g.fillCircle(9, 9, 8);
    g.fillStyle(0x5ec23f, 1);
    g.fillCircle(9, 9, 5);
    g.generateTexture('pea', 18, 18);

    /* --- Ice Pea (fired by the Snow Pea) ---------------------------------- */
    g.clear();
    g.fillStyle(0x9fdcff, 1);
    g.fillCircle(9, 9, 8);
    g.fillStyle(0x5cb8e6, 1);
    g.fillCircle(9, 9, 5);
    g.fillStyle(0xe8f8ff, 1);
    g.fillCircle(6, 6, 2.5);
    g.generateTexture('icepea', 18, 18);

    /* --- Sun -------------------------------------------------------------- */
    g.clear();
    g.fillStyle(0xffc93b, 0.5);
    g.fillCircle(22, 22, 21);
    g.fillStyle(0xffd93b, 1);
    g.fillCircle(22, 22, 16);
    g.fillStyle(0xfff2a8, 1);
    g.fillCircle(22, 22, 9);
    g.generateTexture('sun', 44, 44);

    /* --- Snow Pea --------------------------------------------------------- */
    g.clear();
    g.fillStyle(0x2f8f2f, 1);
    g.fillRect(28, 30, 8, 32);
    g.fillStyle(0x35a035, 1);
    g.fillEllipse(22, 52, 24, 12);
    g.fillStyle(0x8fd8ff, 1);
    g.fillCircle(32, 24, 17);
    g.fillStyle(0x5cb8e6, 1);
    g.fillCircle(47, 21, 8);
    g.fillStyle(0xe6f7ff, 1);
    g.fillCircle(29, 19, 4);
    g.generateTexture('snowpea', 64, 64);

    /* --- Repeater --------------------------------------------------------- */
    g.clear();
    g.fillStyle(0x2f8f2f, 1);
    g.fillRect(28, 32, 8, 30);
    g.fillStyle(0x35a035, 1);
    g.fillEllipse(22, 54, 24, 12);
    g.fillStyle(0x39a139, 1);
    g.fillCircle(30, 26, 18);
    g.fillStyle(0x2b7d2b, 1);
    g.fillCircle(46, 17, 8);
    g.fillCircle(46, 33, 8);
    g.fillStyle(0x1f6b1f, 1);
    g.fillCircle(26, 22, 4);
    g.generateTexture('repeater', 64, 64);

    /* --- Threepeater ------------------------------------------------------ */
    g.clear();
    g.fillStyle(0x2f8f2f, 1);
    g.fillRect(28, 30, 8, 34);
    g.fillStyle(0x35a035, 1);
    g.fillEllipse(20, 56, 24, 10);
    g.fillStyle(0x4fbf4f, 1);
    g.fillCircle(27, 13, 11);
    g.fillCircle(29, 30, 12);
    g.fillCircle(27, 47, 11);
    g.fillStyle(0x2b7d2b, 1);
    g.fillCircle(39, 11, 5);
    g.fillCircle(42, 29, 5);
    g.fillCircle(39, 48, 5);
    g.generateTexture('threepeater', 64, 64);

    /* --- Wall-nut (three damage states) ----------------------------------- */
    const drawWallNut = (cracked: boolean, broken: boolean): void => {
      g.clear();
      g.fillStyle(0x8a5a2b, 1);
      g.fillEllipse(32, 36, 48, 54);
      g.fillStyle(0xa87338, 1);
      g.fillEllipse(30, 33, 36, 44);
      g.fillStyle(0x2b1c0e, 1);
      g.fillCircle(25, 31, 3);
      g.fillCircle(40, 31, 3);
      g.fillRect(27, 43, 12, 3);

      if (cracked || broken) {
        g.lineStyle(2, 0x4a2f14, 1);
        g.lineBetween(13, 26, 24, 38);
        g.lineBetween(49, 44, 40, 54);
      }

      if (broken) {
        g.lineStyle(3, 0x321c08, 1);
        g.lineBetween(7, 41, 20, 30);
        g.lineBetween(44, 19, 55, 34);
        g.lineBetween(29, 11, 34, 24);
      }
    };

    drawWallNut(false, false);
    g.generateTexture('wallnut', 64, 64);
    drawWallNut(true, false);
    g.generateTexture('wallnut-cracked', 64, 64);
    drawWallNut(true, true);
    g.generateTexture('wallnut-broken', 64, 64);

    /* --- Potato Mine (buried / armed) ------------------------------------- */
    const drawPotato = (armed: boolean): void => {
      g.clear();
      g.fillStyle(0x6b4a2b, 1);
      g.fillEllipse(32, 46, 50, 28);
      g.fillStyle(0x8a6238, 1);
      g.fillEllipse(30, 43, 36, 18);
      g.fillStyle(0x2b1c0e, 1);
      g.fillCircle(24, 42, 2);
      g.fillCircle(40, 42, 2);
      g.fillStyle(0x3a3a3a, 1);
      g.fillRect(30, 18, 4, 16);
      g.fillStyle(armed ? 0xff3b3b : 0x6b6b6b, 1);
      g.fillCircle(32, 16, 6);

      if (armed) {
        g.fillStyle(0xffc0c0, 1);
        g.fillCircle(30, 14, 2);
      }
    };

    drawPotato(false);
    g.generateTexture('potatomine', 64, 64);
    drawPotato(true);
    g.generateTexture('potatomine-armed', 64, 64);

    /* --- Cherry Bomb ------------------------------------------------------ */
    g.clear();
    g.fillStyle(0x2f8f2f, 1);
    g.fillRect(30, 6, 5, 16);
    g.fillRect(22, 10, 16, 4);
    g.fillStyle(0x1f6b1f, 1);
    g.fillEllipse(40, 12, 16, 8);
    g.fillStyle(0xd42b2b, 1);
    g.fillCircle(22, 40, 17);
    g.fillStyle(0xb81f1f, 1);
    g.fillCircle(44, 42, 15);
    g.fillStyle(0xff8a8a, 1);
    g.fillCircle(17, 34, 5);
    g.fillCircle(39, 36, 4);
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(19, 42, 2.5);
    g.fillCircle(28, 42, 2.5);
    g.fillCircle(41, 44, 2.5);
    g.fillCircle(50, 44, 2.5);
    g.generateTexture('cherrybomb', 64, 64);

    g.destroy();
  }
}
