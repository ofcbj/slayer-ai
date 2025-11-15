# BattleScene 아키텍처 다이어그램

## 전체 객체 관계도

```mermaid
classDiagram
    class BattleScene {
        -DeckManager deckManager
        -BattleManager battleManager
        -BattleUIManager uiManager
        -CardHandManager cardHandManager
        -CardViewManager cardViewManager
        -BattleEventManager eventManager
        -Enemy[] enemies
        -Player playerCharacter
        -GameState gameState
        +create()
        +initializeManagers()
        +createUI()
        +startPlayerTurn()
        +endPlayerTurn()
        +updateUI()
        +updateDeckInfo()
    }

    class DeckManager {
        -CardData[] deck
        -CardData[] discardPile
        +initializeDeck()
        +drawCard() CardData
        +discardCard()
        +reshuffleDiscardIntoDeck()
        +getDeckSize() number
        +getDiscardPileSize() number
    }

    class BattleManager {
        -turn: 'player'|'enemy'
        -PlayerState playerState
        -Enemy[] enemies
        -BattleCallbacks callbacks
        +getTurn()
        +startPlayerTurn()
        +endPlayerTurn()
        +startEnemyTurn()
        +useCard() boolean
        +playerTakeDamage()
        +executeEnemyAction()
        +checkBattleEnd()
        +winBattle()
    }

    class BattleUIManager {
        -Phaser.Scene scene
        -Container energyContainer
        -Container deckPileContainer
        -Container discardPileContainer
        +createEnergyUI()
        +updateEnergyUI()
        +createEndTurnButton()
        +createDeckPile()
        +createDiscardPile()
        +updateDeckInfo()
        +showMessage()
        +animateDeckPile()
        +animateDiscardPile()
    }

    class CardHandManager {
        -Phaser.Scene scene
        -DeckManager deckManager
        -BattleUIManager uiManager
        -Card[] hand
        -Card selectedCard
        -Container handContainer
        +initializeHandContainer()
        +drawCards()
        +arrangeHand()
        +selectCard()
        +discardCardWithAnimation()
        +discardAllCards()
        +getHandSize() number
    }

    class CardViewManager {
        -Phaser.Scene scene
        +showDeckView()
        +showDiscardPileView()
        +showCardListView()
        +createMiniCard()
    }

    class BattleEventManager {
        -Phaser.Scene scene
        -BattleManager battleManager
        -CardHandManager cardHandManager
        -DeckManager deckManager
        -BattleUIManager uiManager
        -Player playerCharacter
        -Enemy[] enemies
        +registerEventListeners()
        +useCard()
        -onCardClicked()
        -onEnemyClicked()
        -onEnemyDefeated()
    }

    class Card {
        -CardData cardData
        +select()
        +deselect()
        +playEffect()
    }

    class Enemy {
        -EnemyData enemyData
        -EnemyIntent intent
        +takeDamage()
        +playAttackAnimation()
        +applyDefense()
        +isDead() boolean
    }

    class Player {
        -number health
        -number defense
        +takeDamage()
        +updateStats()
        +playDefendAnimation()
        +playHealAnimation()
        +idle()
    }

    class BattleCallbacks {
        <<interface>>
        +onPlayerTurnStart()
        +onEnemyTurnStart()
        +onEnemyAction()
        +onPlayerTakeDamage()
        +onEnemyDefeated()
        +onBattleEnd()
        +onPlayerEnergyChange()
        +onPlayerDefenseChange()
        +onPlayerHealthChange()
    }

    class CardData {
        <<interface>>
        +name: string
        +damage?: number
        +block?: number
        +heal?: number
        +energy?: number
        +cost: number
    }

    class NormalizedCardData {
        <<interface>>
        +name: string
        +type: string
        +cost: number
        +value: number
        +rawData: CardData
    }

    %% BattleScene 관계
    BattleScene *-- DeckManager : owns
    BattleScene *-- BattleManager : owns
    BattleScene *-- BattleUIManager : owns
    BattleScene *-- CardHandManager : owns
    BattleScene *-- CardViewManager : owns
    BattleScene *-- BattleEventManager : owns
    BattleScene --> Player : creates
    BattleScene --> Enemy : creates

    %% Manager 간 관계
    CardHandManager --> DeckManager : uses
    CardHandManager --> BattleUIManager : uses
    CardHandManager --> Card : manages

    BattleEventManager --> BattleManager : uses
    BattleEventManager --> CardHandManager : uses
    BattleEventManager --> DeckManager : uses
    BattleEventManager --> BattleUIManager : uses
    BattleEventManager --> Player : interacts
    BattleEventManager --> Enemy : interacts
    BattleEventManager --> Card : handles

    BattleManager --> Enemy : manages
    BattleManager ..> BattleCallbacks : notifies

    BattleUIManager --> CardViewManager : triggers
    CardViewManager --> CardData : displays

    DeckManager --> CardData : manages

    %% BattleScene 콜백
    BattleScene ..> BattleCallbacks : implements
    BattleManager ..> BattleCallbacks : uses

    %% 데이터 흐름
    DeckManager --> CardData : returns
    CardHandManager --> NormalizedCardData : creates
    Card --> NormalizedCardData : contains
```

## 데이터 흐름도

```mermaid
flowchart TD
    A[BattleScene] -->|초기화| B[DeckManager]
    A -->|초기화| C[BattleManager]
    A -->|초기화| D[BattleUIManager]
    A -->|초기화| E[CardHandManager]
    A -->|초기화| F[CardViewManager]
    A -->|초기화| G[BattleEventManager]

    C -->|콜백| A
    C -->|전투 로직| H[Player]
    C -->|전투 로직| I[Enemy]

    E -->|카드 드로우| B
    E -->|UI 애니메이션| D
    E -->|카드 관리| J[Card]

    G -->|이벤트 처리| C
    G -->|카드 사용| E
    G -->|카드 버리기| B
    G -->|메시지 표시| D
    G -->|상호작용| H
    G -->|상호작용| I

    D -->|뷰 요청| F
    F -->|카드 데이터 표시| B

    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#ffe1f5
    style D fill:#e1ffe1
    style E fill:#f5e1ff
    style F fill:#ffe1e1
    style G fill:#e1ffff
```

## 책임 분리도

```mermaid
graph TB
    subgraph "BattleScene - 조율자"
        BS[BattleScene<br/>씬 초기화 및 매니저 조율]
    end

    subgraph "전투 로직 계층"
        BM[BattleManager<br/>턴 관리, 전투 로직]
        DM[DeckManager<br/>덱/버린 카드 관리]
    end

    subgraph "UI 계층"
        UIM[BattleUIManager<br/>에너지, 버튼, 덱 UI]
        CVM[CardViewManager<br/>카드 목록 팝업]
    end

    subgraph "카드 관리 계층"
        CHM[CardHandManager<br/>카드 핸드, 드로우, 버리기]
    end

    subgraph "이벤트 계층"
        EVM[BattleEventManager<br/>이벤트 처리, 카드 사용]
    end

    subgraph "게임 객체"
        C[Card]
        P[Player]
        E[Enemy]
    end

    BS --> BM
    BS --> DM
    BS --> UIM
    BS --> CVM
    BS --> CHM
    BS --> EVM
    BS --> P
    BS --> E

    BM -.콜백.-> BS
    BM --> P
    BM --> E

    CHM --> DM
    CHM --> UIM
    CHM --> C

    EVM --> BM
    EVM --> CHM
    EVM --> DM
    EVM --> UIM
    EVM --> C
    EVM --> P
    EVM --> E

    UIM --> CVM
    CVM --> DM

    style BS fill:#4a90e2,color:#fff
    style BM fill:#e74c3c,color:#fff
    style DM fill:#e74c3c,color:#fff
    style UIM fill:#2ecc71,color:#fff
    style CVM fill:#2ecc71,color:#fff
    style CHM fill:#9b59b6,color:#fff
    style EVM fill:#f39c12,color:#fff
    style C fill:#95a5a6,color:#fff
    style P fill:#95a5a6,color:#fff
    style E fill:#95a5a6,color:#fff
```

## 상호작용 시퀀스 다이어그램 (카드 사용 예시)

```mermaid
sequenceDiagram
    participant User
    participant BS as BattleScene
    participant EVM as BattleEventManager
    participant BM as BattleManager
    participant CHM as CardHandManager
    participant DM as DeckManager
    participant UIM as BattleUIManager
    participant Card
    participant Enemy

    User->>Card: 클릭
    Card->>EVM: cardClicked 이벤트
    EVM->>BM: useCard()
    BM->>BM: 에너지 확인 및 소모
    BM->>Enemy: takeDamage()
    BM-->>EVM: success
    EVM->>Card: playEffect()
    EVM->>CHM: removeCardFromHand()
    EVM->>DM: discardCard()
    EVM->>CHM: discardCardWithAnimation()
    EVM->>CHM: arrangeHand()
    EVM->>UIM: updateDeckInfo()
    EVM->>BS: updateDeckInfo() 콜백
    BS->>UIM: updateDeckInfo()
```

## 주요 책임 요약

| 클래스 | 주요 책임 | 의존성 |
|--------|----------|--------|
| **BattleScene** | 씬 초기화, 매니저 조율 | 모든 매니저 |
| **BattleManager** | 전투 로직, 턴 관리 | Enemy, BattleCallbacks |
| **DeckManager** | 덱/버린 카드 데이터 관리 | CardData |
| **BattleUIManager** | UI 요소 생성 및 업데이트 | Phaser.Scene |
| **CardHandManager** | 카드 핸드 관리, 드로우/버리기 | DeckManager, BattleUIManager |
| **CardViewManager** | 카드 목록 팝업 표시 | Phaser.Scene |
| **BattleEventManager** | 이벤트 처리, 카드 사용 | 모든 매니저, 게임 객체 |

