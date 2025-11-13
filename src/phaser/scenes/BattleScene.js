import Phaser from 'phaser';
import Card from '../objects/Card.js';
import Enemy from '../objects/Enemy.js';
import Player from '../objects/Player.js';

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  init() {
    this.selectedCard = null;
    this.hand = [];
    this.deck = [];
    this.discardPile = [];
    this.enemies = [];
    this.turn = 'player';
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 배경
    this.add.rectangle(0, 0, width, height, 0x0f0f1e).setOrigin(0);

    // 게임 상태 가져오기
    this.gameState = this.registry.get('gameState');
    this.selectedStage = this.registry.get('selectedStage');

    // 플레이어 에너지 초기화
    this.gameState.player.energy = this.gameState.player.maxEnergy;
    this.gameState.player.defense = 0;

    // 플레이어 캐릭터 생성 (중앙 하단)
    this.createPlayerCharacter();

    // UI 생성
    this.createPlayerUI();
    this.createEnemies();
    this.createDeckArea();

    // 이벤트 리스너
    this.events.on('cardClicked', this.onCardClicked, this);
    this.events.on('enemyClicked', this.onEnemyClicked, this);
    this.events.on('enemyDefeated', this.onEnemyDefeated, this);

    // 초기 덱 설정
    this.setupDeck();

    // 첫 턴 시작
    this.startPlayerTurn();
  }

  createPlayerCharacter() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 플레이어 캐릭터를 중앙 하단에 배치 (적과 카드 사이)
    this.playerCharacter = new Player(this, width / 2, height / 2 + 100);
    this.playerCharacter.idle(); // 아이들 애니메이션 시작
  }

  createPlayerUI() {
    const width = this.cameras.main.width;

    // Energy (오른쪽)
    this.createEnergyUI();

    // 턴 종료 버튼
    this.createEndTurnButton();
  }

  createEnergyUI() {
    const width = this.cameras.main.width;
    const x = width - 300;
    const y = 580;

    // Energy 컨테이너
    const energyContainer = this.add.container(x, y);

    // Energy 아이콘들 (구슬)
    this.energyOrbs = [];
    const orbSpacing = 50;

    for (let i = 0; i < this.gameState.player.maxEnergy; i++) {
      const orb = this.add.circle(i * orbSpacing, 0, 20, 0xf39c12);
      orb.setStrokeStyle(3, 0xffffff);

      // 빛나는 효과
      const glow = this.add.circle(i * orbSpacing, 0, 24, 0xffcc00, 0.3);

      this.energyOrbs.push({ orb, glow, active: true });
      energyContainer.add([glow, orb]);

      // 펄스 애니메이션
      this.tweens.add({
        targets: glow,
        scaleX: 1.2,
        scaleY: 1.2,
        alpha: 0.5,
        duration: 800,
        yoyo: true,
        repeat: -1,
        delay: i * 100
      });
    }

    this.energyContainer = energyContainer;
  }

  createEndTurnButton() {
    const width = this.cameras.main.width;

    const button = this.add.container(width - 200, 50);

    const bg = this.add.rectangle(0, 0, 150, 60, 0xff6b6b);
    bg.setStrokeStyle(3, 0xffffff);

    const text = this.add.text(0, 0, 'End Turn', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fill: '#ffffff'
    });
    text.setOrigin(0.5);

    button.add([bg, text]);
    button.setSize(150, 60);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      this.tweens.add({
        targets: button,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100
      });
      bg.setFillStyle(0xff8888);
    });

    button.on('pointerout', () => {
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
      bg.setFillStyle(0xff6b6b);
    });

    button.on('pointerdown', () => {
      if (this.turn === 'player') {
        this.endPlayerTurn();
      }
    });

    this.endTurnButton = button;
  }

  createEnemies() {
    const width = this.cameras.main.width;
    const enemiesData = this.registry.get('enemiesData');
    const stageEnemies = this.selectedStage.data.enemies;

    const spacing = Math.min(300, width / (stageEnemies.length + 1));
    const startX = (width - (spacing * (stageEnemies.length - 1))) / 2;

    stageEnemies.forEach((enemyName, index) => {
      const enemyData = enemiesData[enemyName];
      if (enemyData) {
        const x = startX + (index * spacing);
        const y = 220; // 적들을 상단에 배치

        const enemy = new Enemy(this, x, y, enemyData, index);
        this.enemies.push(enemy);

        // 적 의도 설정
        this.setEnemyIntent(enemy);
      }
    });
  }

  setEnemyIntent(enemy) {
    const enemyData = enemy.enemyData;

    // 적 데이터에 따라 의도 설정
    if (enemyData.defense && Phaser.Math.Between(0, 100) < 30) {
      // 30% 확률로 방어
      enemy.setIntent({ type: 'defend', value: enemyData.defense });
    } else if (enemyData.attack) {
      // 기본은 공격
      enemy.setIntent({ type: 'attack', value: enemyData.attack });
    } else {
      // 공격력이 없으면 랜덤
      const damage = Phaser.Math.Between(5, 10);
      enemy.setIntent({ type: 'attack', value: damage });
    }
  }

  createDeckArea() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 핸드 영역
    this.handContainer = this.add.container(width / 2, height - 130);

    // 덱 정보
    this.deckText = this.add.text(50, height - 50, '', {
      fontSize: '18px',
      fontFamily: 'monospace',
      fill: '#ffffff'
    });

    this.updateDeckInfo();
  }

  setupDeck() {
    const cardsData = this.registry.get('cardsData');

    // 기본 덱 생성 (플레이어 덱이 비어있으면)
    if (this.gameState.deck.length === 0) {
      this.gameState.deck = [
        ...Array(5).fill(cardsData.basic[0]), // 강타 x5
        ...Array(4).fill(cardsData.basic[1]), // 방어 x4
        ...Array(1).fill(cardsData.basic[4])  // 집중 x1
      ];
    }

    // 덱을 복사하고 섞기
    this.deck = [...this.gameState.deck];
    Phaser.Utils.Array.Shuffle(this.deck);
  }

  startPlayerTurn() {
    this.turn = 'player';

    // 에너지 회복
    this.gameState.player.energy = this.gameState.player.maxEnergy;

    // 방어도 초기화
    this.gameState.player.defense = 0;

    // 카드 뽑기 (5장)
    this.drawCards(5);

    this.updateUI();
  }

  drawCards(count) {
    for (let i = 0; i < count; i++) {
      if (this.deck.length === 0) {
        // 덱이 비었으면 버린 카드 더미를 섞어서 덱으로
        this.deck = [...this.discardPile];
        this.discardPile = [];
        Phaser.Utils.Array.Shuffle(this.deck);

        if (this.deck.length === 0) break; // 그래도 비었으면 중단
      }

      const cardData = this.deck.pop();
      this.addCardToHand(cardData);
    }

    this.arrangeHand();
    this.updateDeckInfo();
  }

  addCardToHand(cardData) {
    // 카드 타입 정규화
    const normalizedCard = this.normalizeCardData(cardData);
    const card = new Card(this, 0, 0, normalizedCard);
    this.hand.push(card);
    this.handContainer.add(card);
  }

  normalizeCardData(cardData) {
    // 기존 카드 데이터를 Card 클래스가 기대하는 형식으로 변환
    return {
      name: cardData.name,
      type: cardData.damage ? '공격' : cardData.block ? '방어' : cardData.heal ? '치유' : cardData.energy ? '에너지' : '스킬',
      cost: cardData.cost,
      value: cardData.damage || cardData.block || cardData.heal || cardData.energy || 0,
      allEnemies: cardData.allEnemies || false,
      hits: cardData.hits || 1,
      selfDamage: cardData.selfDamage || 0,
      description: cardData.description,
      rawData: cardData
    };
  }

  arrangeHand() {
    const cardCount = this.hand.length;
    const spacing = 150;
    const totalWidth = (cardCount - 1) * spacing;
    const startX = -totalWidth / 2;

    this.hand.forEach((card, index) => {
      const targetX = startX + (index * spacing);
      const targetY = 0;

      this.tweens.add({
        targets: card,
        x: targetX,
        y: targetY,
        duration: 300,
        ease: 'Back.easeOut'
      });

      card.originalY = targetY;
    });
  }

  onCardClicked(card) {
    if (this.turn !== 'player') return;

    // 에너지가 부족한 경우
    if (this.gameState.player.energy < card.cardData.cost) {
      this.showMessage('Not enough energy!');
      return;
    }

    // 이전에 선택된 카드 해제
    if (this.selectedCard && this.selectedCard !== card) {
      this.selectedCard.deselect();
    }

    // 카드 선택
    this.selectedCard = card;
    card.select();

    // 공격 카드인 경우 적 선택 대기, 아니면 즉시 사용
    if (card.cardData.type === '공격' && !card.cardData.allEnemies) {
      this.showMessage('Select a target');
    } else {
      // 자동 사용 (방어, 치유, 전체 공격 등)
      this.useCard(card);
    }
  }

  onEnemyClicked(enemy) {
    if (this.turn !== 'player') return;
    if (!this.selectedCard) return;
    if (this.selectedCard.cardData.type !== '공격') return;

    this.useCard(this.selectedCard, enemy);
  }

  useCard(card, target = null) {
    const cardData = card.cardData;

    // 에너지 소모
    this.gameState.player.energy -= cardData.cost;

    // 카드 효과 적용
    if (cardData.type === '공격') {
      if (cardData.allEnemies) {
        // 모든 적에게 공격
        this.enemies.forEach(enemy => {
          if (!enemy.isDead()) {
            for (let i = 0; i < cardData.hits; i++) {
              enemy.takeDamage(cardData.value);
            }
          }
        });

        card.playEffect(this.cameras.main.width / 2, 250, () => {
          this.checkBattleEnd();
        });
      } else if (target) {
        // 단일 적 공격
        for (let i = 0; i < cardData.hits; i++) {
          target.takeDamage(cardData.value);
        }

        card.playEffect(target.x, target.y, () => {
          this.checkBattleEnd();
        });
      }

      // 자신에게 피해
      if (cardData.selfDamage) {
        this.playerTakeDamage(cardData.selfDamage);
      }
    } else if (cardData.type === '방어') {
      this.gameState.player.defense += cardData.value;

      // 플레이어 캐릭터 방어 애니메이션
      this.playerCharacter.playDefendAnimation();

      card.playEffect(this.playerCharacter.x, this.playerCharacter.y, null);
    } else if (cardData.type === '치유') {
      this.gameState.player.health = Math.min(
        this.gameState.player.maxHealth,
        this.gameState.player.health + cardData.value
      );

      // 플레이어 캐릭터 치유 애니메이션
      this.playerCharacter.playHealAnimation();

      card.playEffect(this.playerCharacter.x, this.playerCharacter.y, null);
    } else if (cardData.type === '에너지') {
      this.gameState.player.energy += cardData.value;

      card.playEffect(this.playerCharacter.x, this.playerCharacter.y, null);
    }

    // 핸드에서 제거
    const index = this.hand.indexOf(card);
    if (index > -1) {
      this.hand.splice(index, 1);
    }

    // 버린 카드 더미로
    this.discardPile.push(cardData.rawData);

    // 선택 해제
    this.selectedCard = null;

    // 핸드 재배치
    this.arrangeHand();

    // UI 업데이트
    this.updateUI();
  }

  playerTakeDamage(amount) {
    // 방어도로 먼저 흡수
    const remainingDamage = Math.max(0, amount - this.gameState.player.defense);
    this.gameState.player.defense = Math.max(0, this.gameState.player.defense - amount);

    if (remainingDamage > 0) {
      this.gameState.player.health -= remainingDamage;

      // 플레이어 캐릭터 피격 애니메이션
      this.playerCharacter.playHitAnimation();

      // 데미지 숫자 표시
      const damageText = this.add.text(this.playerCharacter.x, this.playerCharacter.y - 100, `-${remainingDamage}`, {
        fontSize: '48px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        fill: '#ff6b6b',
        stroke: '#000000',
        strokeThickness: 6
      });
      damageText.setOrigin(0.5);

      this.tweens.add({
        targets: damageText,
        y: damageText.y - 60,
        alpha: 0,
        duration: 1200,
        ease: 'Power2',
        onComplete: () => damageText.destroy()
      });

      // 화면 빨갛게
      this.cameras.main.flash(200, 255, 0, 0, false, (camera, progress) => {
        if (progress === 1) {
          this.checkGameOver();
        }
      });
    } else {
      // 방어로 막았을 때
      this.playerCharacter.playDefendAnimation();

      const blockText = this.add.text(this.playerCharacter.x, this.playerCharacter.y - 100, `BLOCK`, {
        fontSize: '36px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        fill: '#4ecdc4',
        stroke: '#000000',
        strokeThickness: 5
      });
      blockText.setOrigin(0.5);

      this.tweens.add({
        targets: blockText,
        y: blockText.y - 50,
        alpha: 0,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => blockText.destroy()
      });
    }

    this.updateUI();
  }

  endPlayerTurn() {
    // 손에 있는 모든 카드 버리기
    this.hand.forEach(card => {
      this.discardPile.push(card.cardData.rawData);
      card.destroy();
    });
    this.hand = [];

    this.updateDeckInfo();

    // 적 턴 시작
    this.time.delayedCall(500, () => {
      this.startEnemyTurn();
    });
  }

  startEnemyTurn() {
    this.turn = 'enemy';

    let delay = 0;

    this.enemies.forEach(enemy => {
      if (!enemy.isDead()) {
        this.time.delayedCall(delay, () => {
          this.executeEnemyAction(enemy);
        });
        delay += 1000;
      }
    });

    // 모든 적 행동 후 플레이어 턴
    this.time.delayedCall(delay + 500, () => {
      this.startPlayerTurn();
    });
  }

  executeEnemyAction(enemy) {
    const intent = enemy.intent;

    if (intent.type === 'attack') {
      enemy.playAttackAnimation(() => {
        this.playerTakeDamage(intent.value);
      });
    } else if (intent.type === 'defend') {
      // 적 방어도 증가
      enemy.applyDefense(intent.value);
    }

    // 다음 의도 설정
    this.setEnemyIntent(enemy);
  }

  onEnemyDefeated(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.enemies.splice(index, 1);
    }

    this.checkBattleEnd();
  }

  checkBattleEnd() {
    const aliveEnemies = this.enemies.filter(e => !e.isDead());

    if (aliveEnemies.length === 0) {
      this.time.delayedCall(1000, () => {
        this.winBattle();
      });
    }
  }

  checkGameOver() {
    if (this.gameState.player.health <= 0) {
      this.time.delayedCall(1000, () => {
        this.scene.start('GameOverScene');
      });
    }
  }

  winBattle() {
    // 스테이지 클리어 처리
    if (!this.gameState.stagesCleared.includes(this.selectedStage.id)) {
      this.gameState.stagesCleared.push(this.selectedStage.id);
    }

    // 체력 회복
    const healPercent = this.selectedStage.data.type === '보스' ? 0.6 :
                        this.selectedStage.data.type === '중보스' ? 0.4 : 0.25;
    const healAmount = Math.floor(this.gameState.player.maxHealth * healPercent);
    this.gameState.player.health = Math.min(
      this.gameState.player.maxHealth,
      this.gameState.player.health + healAmount
    );

    // 다음 스테이지 설정
    const nextStages = this.selectedStage.data.nextStages;
    if (nextStages && nextStages.length > 0) {
      this.gameState.currentStage = nextStages[0];
    }

    // 보상 씬으로
    this.scene.start('RewardScene');
  }

  updateUI() {
    // 플레이어 캐릭터 스탯 업데이트
    this.playerCharacter.updateStats(
      this.gameState.player.health,
      this.gameState.player.defense
    );

    // 현재 에너지에 맞춰 필요한 구슬 개수 계산
    const currentEnergy = this.gameState.player.energy;
    const maxEnergy = this.gameState.player.maxEnergy;
    const requiredOrbs = Math.max(currentEnergy, maxEnergy);
    const currentOrbCount = this.energyOrbs.length;

    // 필요하면 구슬 추가 (에너지가 maxEnergy를 초과한 경우)
    if (requiredOrbs > currentOrbCount) {
      const orbSpacing = 50;
      for (let i = currentOrbCount; i < requiredOrbs; i++) {
        const orb = this.add.circle(i * orbSpacing, 0, 20, 0xf39c12);
        orb.setStrokeStyle(3, 0xffffff);

        // 빛나는 효과
        const glow = this.add.circle(i * orbSpacing, 0, 24, 0xffcc00, 0.3);

        this.energyOrbs.push({ orb, glow, active: true });
        this.energyContainer.add([glow, orb]);

        // 펄스 애니메이션
        this.tweens.add({
          targets: glow,
          scaleX: 1.2,
          scaleY: 1.2,
          alpha: 0.5,
          duration: 800,
          yoyo: true,
          repeat: -1,
          delay: i * 100
        });

        // 등장 애니메이션
        orb.setScale(0);
        glow.setScale(0);
        this.tweens.add({
          targets: [orb, glow],
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          ease: 'Back.easeOut'
        });
      }
    }

    // Energy 구슬 상태 업데이트
    this.energyOrbs.forEach((orbData, index) => {
      if (index < currentEnergy) {
        // 활성 에너지
        const isBonus = index >= maxEnergy;
        orbData.orb.setFillStyle(isBonus ? 0xffcc00 : 0xf39c12); // 보너스 에너지는 더 밝은 색
        orbData.orb.setAlpha(1);
        orbData.glow.setAlpha(isBonus ? 0.5 : 0.3);
        orbData.active = true;
      } else {
        // 비활성 에너지
        orbData.orb.setFillStyle(0x666666);
        orbData.orb.setAlpha(0.5);
        orbData.glow.setAlpha(0);
        orbData.active = false;
      }
    });
  }

  updateDeckInfo() {
    this.deckText.setText(`Deck: ${this.deck.length} | Hand: ${this.hand.length} | Discard: ${this.discardPile.length}`);
  }

  showMessage(text) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const message = this.add.text(width / 2, height / 2, text, {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6
    });
    message.setOrigin(0.5);

    this.tweens.add({
      targets: message,
      alpha: 0,
      y: height / 2 - 50,
      duration: 1500,
      onComplete: () => message.destroy()
    });
  }
}
