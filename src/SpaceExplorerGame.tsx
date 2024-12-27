import React, {
    useState,
    useEffect,
    useRef,
    RefObject,
    KeyboardEvent
  } from 'react';
  
  /* ------------------ Constants & Config ------------------ */
  const SECTOR_WIDTH = 800;
  const SECTOR_HEIGHT = 600;
  
  /** Ship speeds */
  const BASE_SHIP_SPEED = 3;
  const BOOSTED_SHIP_SPEED = 5;
  const BOOST_DURATION = 200; // frames (approx)
  
  /** Drone speeds */
  const DRONE_SPEED_HORZ = 2;
  const DRONE_SPEED_VERT = 1.5;
  const DRONE_SPEED_DIAG = 1.5;
  
  /** Drone bounds (optional patrol ranges) */
  const DRONE_BOUND_LEFT = 100;
  const DRONE_BOUND_RIGHT = 700;
  const DRONE_BOUND_TOP = 50;
  const DRONE_BOUND_BOTTOM = 550;
  
  /** Hull Integrity (HP) */
  const MAX_HULL = 100;
  
  /** Number of stardust orbs to collect */
  const STARDUST_COUNT = 6;
  
  /** Number of flickering stars for background animation */
  const STAR_COUNT = 50;
  
  /** Number of power-ups */
  const POWERUP_COUNT = 2; // e.g., 1 hull restore, 1 speed boost
  
  /** Planets for decoration */
  const PLANETS = [
    { name: 'Planet Aurelia', x: 150, y: 100 },
    { name: 'Planet Zenith', x: 500, y: 150 },
    { name: 'Moon Caligo', x: 250, y: 400 }
  ];
  
  /* ------------------ Interfaces ------------------ */
  interface Ship {
    x: number;
    y: number;
    width: number;
    height: number;
    hull: number; 
    boostTimer: number; // how many frames left of speed boost
  }
  
  interface Stardust {
    id: number;
    x: number;
    y: number;
    collected: boolean;
  }
  
  interface Star {
    id: number;
    x: number;
    y: number;
    size: number;
    alpha: number;
    alphaChange: number;
  }
  
  interface PowerUp {
    id: number;
    x: number;
    y: number;
    type: 'hull' | 'boost';
    claimed: boolean;
  }
  
  interface AlienDrone {
    x: number;
    y: number;
    width: number;
    height: number;
    behavior: 'horizontal' | 'vertical' | 'diagonal';
    direction: 1 | -1;
  }
  
  interface GameState {
    ship: Ship;
    keys: Record<string, boolean>;
    stardust: Stardust[];
    stars: Star[];
    powerups: PowerUp[];
    score: number;
    drones: AlienDrone[];
    gameOver: boolean;
  }
  
  /* ------------------ Main “Space Explorer” Component ------------------ */
  export default function SpaceExplorerGame(): JSX.Element {
    const [gameState, setGameState] = useState<GameState>(() => ({
      ship: {
        x: 400,
        y: 300,
        width: 40,
        height: 40,
        hull: MAX_HULL,
        boostTimer: 0
      },
      keys: {},
      stardust: generateStardust(STARDUST_COUNT),
      stars: generateStars(STAR_COUNT),
      powerups: generatePowerUps(POWERUP_COUNT),
      score: 0,
      drones: [
        {
          x: 200,
          y: 500,
          width: 40,
          height: 40,
          behavior: 'horizontal',
          direction: 1
        },
        {
          x: 600,
          y: 100,
          width: 40,
          height: 40,
          behavior: 'vertical',
          direction: 1
        },
        {
          x: 100,
          y: 150,
          width: 40,
          height: 40,
          behavior: 'diagonal',
          direction: 1
        }
      ],
      gameOver: false
    }));
  
    const canvasRef: RefObject<HTMLCanvasElement> = useRef(null);
  
    // Manage game loop
    useGameLoop(gameState, setGameState, canvasRef);
    // Manage keyboard
    useKeyboardControls(gameState, setGameState);
  
    function handleRestart() {
      // Restart from scratch
      setGameState({
        ship: {
          x: 400,
          y: 300,
          width: 40,
          height: 40,
          hull: MAX_HULL,
          boostTimer: 0
        },
        keys: {},
        stardust: generateStardust(STARDUST_COUNT),
        stars: generateStars(STAR_COUNT),
        powerups: generatePowerUps(POWERUP_COUNT),
        score: 0,
        drones: [
          {
            x: 200,
            y: 500,
            width: 40,
            height: 40,
            behavior: 'horizontal',
            direction: 1
          },
          {
            x: 600,
            y: 100,
            width: 40,
            height: 40,
            behavior: 'vertical',
            direction: 1
          },
          {
            x: 100,
            y: 150,
            width: 40,
            height: 40,
            behavior: 'diagonal',
            direction: 1
          }
        ],
        gameOver: false
      });
    }
  
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
        <h1 className="text-white text-2xl mb-4">
          Space Explorer - Extended 2D Flight
        </h1>
        <canvas
          ref={canvasRef}
          width={SECTOR_WIDTH}
          height={SECTOR_HEIGHT}
          className="border-4 border-blue-500 rounded-lg"
        />
        <p className="mt-3 text-white">
          Arrow Keys = Fly in any direction | Collect Stardust + PowerUps,
          Avoid Drones!
        </p>
        {gameState.gameOver && (
          <button
            onClick={handleRestart}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Restart
          </button>
        )}
      </div>
    );
  }
  
  /* ----------------------------------------------------------------
     Hook: Main Game Loop (requestAnimationFrame)
  ------------------------------------------------------------------ */
  function useGameLoop(
    gameState: GameState,
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    canvasRef: RefObject<HTMLCanvasElement>
  ) {
    const stateRef = useRef(gameState);
  
    useEffect(() => {
      stateRef.current = gameState;
    }, [gameState]);
  
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
  
      let animId = 0;
  
      const loop = () => {
        const st = stateRef.current;
        if (st.gameOver) {
          renderGameOver(ctx);
        } else {
          renderFrame(ctx, st, setGameState);
        }
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
  
      return () => cancelAnimationFrame(animId);
    }, [canvasRef, setGameState]);
  }
  
  /* ----------------------------------------------------------------
     Hook: Keyboard Controls
     - Up/Down/Left/Right for free 2D flight
  ------------------------------------------------------------------ */
  function useKeyboardControls(
    gameState: GameState,
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
  ) {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { keys, gameOver } = gameState;
      if (gameOver) return;
  
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        setGameState(prev => ({
          ...prev,
          keys: { ...keys, [e.key]: true }
        }));
      }
    };
  
    const handleKeyUp = (e: KeyboardEvent) => {
      const { keys, gameOver } = gameState;
      if (gameOver) return;
  
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        setGameState(prev => {
          const newKeys = { ...keys };
          delete newKeys[e.key];
          return { ...prev, keys: newKeys };
        });
      }
    };
  
    useEffect(() => {
      const onDown = (evt: any) => handleKeyDown(evt as KeyboardEvent);
      const onUp = (evt: any) => handleKeyUp(evt as KeyboardEvent);
      window.addEventListener('keydown', onDown);
      window.addEventListener('keyup', onUp);
      return () => {
        window.removeEventListener('keydown', onDown);
        window.removeEventListener('keyup', onUp);
      };
    }, [gameState]);
  }
  
  /* ----------------------------------------------------------------
     Render a single frame:
     1) Update stars (flicker)
     2) Update ship & drones
     3) Check collisions
     4) Draw everything
     5) Update state
  ------------------------------------------------------------------ */
  function renderFrame(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
  ) {
    // Clear
    ctx.clearRect(0, 0, SECTOR_WIDTH, SECTOR_HEIGHT);
  
    // 1) Update starfield + draw background
    updateStars(state.stars);
    renderBackground(ctx, state.stars);
  
    const { ship, keys, stardust, score, drones, powerups } = state;
  
    // 2) Update ship (2D movement, optional speed boost countdown)
    const { sX, sY, newBoostTimer } = updateShip(ship, keys);
  
    // Update drones
    const updatedDrones = drones.map(d => updateDrone(d));
  
    // 3) Check collisions
    //    - stardust
    const [updatedDust, updatedScore] = processStardust(stardust, score, sX, sY, ship);
    //    - drone => hull damage
    let newHull = ship.hull;
    for (let d of updatedDrones) {
      if (collidesWithDrone(sX, sY, ship, d)) {
        newHull -= 0.3; // reduce hull slowly while overlapping
        newHull = Math.max(0, newHull);
      }
    }
    //    - powerups
    const [updatedPowerups, updatedShip] = processPowerUps(powerups, ship, sX, sY);
  
    // 4) Draw everything
    renderPlanets(ctx);
    renderStardust(ctx, updatedDust);
    renderPowerUps(ctx, updatedPowerups);
  
    // Draw drones
    for (let d of updatedDrones) {
      drawAlienDrone(ctx, d.x, d.y);
    }
  
    // Draw ship (emoji)
    ctx.font = '40px Arial';
    ctx.fillStyle = '#66ccff';
    ctx.textAlign = 'center';
    ctx.fillText('🚀', sX + 20, sY + 30);
  
    // Draw UI
    drawUI(ctx, updatedScore, newHull, updatedShip.boostTimer);
  
    const newGameOver = newHull <= 0;
  
    // 5) Save updated state
    setGameState(prev => ({
      ...prev,
      ship: {
        ...prev.ship,
        x: sX,
        y: sY,
        hull: newHull,
        boostTimer: updatedShip.boostTimer > 0 ? updatedShip.boostTimer : newBoostTimer
      },
      stardust: updatedDust,
      score: updatedScore,
      drones: updatedDrones,
      powerups: updatedPowerups,
      gameOver: newGameOver
    }));
  }
  
  /* ----------------------------------------------------------------
     Starfield Helpers
  ------------------------------------------------------------------ */
  function generateStars(count: number): Star[] {
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        id: i,
        x: Math.random() * SECTOR_WIDTH,
        y: Math.random() * SECTOR_HEIGHT,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.5, // between 0.5 and 1
        alphaChange: (Math.random() * 0.01 + 0.005) * (Math.random() < 0.5 ? 1 : -1)
      });
    }
    return stars;
  }
  
  function updateStars(stars: Star[]) {
    for (let s of stars) {
      s.alpha += s.alphaChange;
      // reverse alphaChange if alpha out of bounds
      if (s.alpha <= 0.2 || s.alpha >= 1) {
        s.alphaChange *= -1;
      }
    }
  }
  
  function renderBackground(ctx: CanvasRenderingContext2D, stars: Star[]) {
    // Fill background
    ctx.fillStyle = '#010119';
    ctx.fillRect(0, 0, SECTOR_WIDTH, SECTOR_HEIGHT);
  
    // Draw stars
    for (let s of stars) {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, 2 * Math.PI);
      ctx.fill();
    }
    // reset alpha
    ctx.globalAlpha = 1.0;
  }
  
  /* ----------------------------------------------------------------
     Power-Up Helpers
  ------------------------------------------------------------------ */
  function generatePowerUps(count: number): PowerUp[] {
    // Example: half hull-restores, half speed boosts
    const arr: PowerUp[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        id: i,
        x: Math.random() * (SECTOR_WIDTH - 50) + 25,
        y: Math.random() * (SECTOR_HEIGHT - 100) + 50,
        type: i % 2 === 0 ? 'hull' : 'boost',
        claimed: false
      });
    }
    return arr;
  }
  
  function renderPowerUps(ctx: CanvasRenderingContext2D, powerups: PowerUp[]) {
    powerups.forEach(p => {
      if (!p.claimed) {
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        if (p.type === 'hull') {
          ctx.fillText('❤️', p.x + 15, p.y + 25);
        } else {
          ctx.fillText('⚡', p.x + 15, p.y + 25);
        }
      }
    });
  }
  
  /** Check power-up collision and apply effect. */
  function processPowerUps(powerups: PowerUp[], ship: Ship, sX: number, sY: number) {
    const updatedShip = { ...ship };
    const updatedPowerups = powerups.map(p => {
      if (!p.claimed && collides(sX, sY, ship.width, ship.height, p.x, p.y, 30, 30)) {
        if (p.type === 'hull') {
          // restore partial hull
          updatedShip.hull = Math.min(MAX_HULL, updatedShip.hull + 20);
        } else if (p.type === 'boost') {
          // set boost timer
          updatedShip.boostTimer = BOOST_DURATION;
        }
        return { ...p, claimed: true };
      }
      return p;
    });
    return [updatedPowerups, updatedShip] as const;
  }
  
  /* ----------------------------------------------------------------
     Ship & Drone Update Helpers
  ------------------------------------------------------------------ */
  
  /** Update ship position in 2D (no gravity). If boostTimer > 0, use faster speed. */
  function updateShip(ship: Ship, keys: Record<string, boolean>) {
    let sX = ship.x;
    let sY = ship.y;
  
    const speed = ship.boostTimer > 0 ? BOOSTED_SHIP_SPEED : BASE_SHIP_SPEED;
  
    if (keys['ArrowLeft'])  sX -= speed;
    if (keys['ArrowRight']) sX += speed;
    if (keys['ArrowUp'])    sY -= speed;
    if (keys['ArrowDown'])  sY += speed;
  
    // clamp within sector
    sX = clamp(sX, 0, SECTOR_WIDTH - ship.width);
    sY = clamp(sY, 0, SECTOR_HEIGHT - ship.height);
  
    // decrement boost timer if active
    let newBoostTimer = ship.boostTimer > 0 ? ship.boostTimer - 1 : 0;
  
    return { sX, sY, newBoostTimer };
  }
  
  /** Update alien drone based on its behavior. */
  function updateDrone(drone: AlienDrone): AlienDrone {
    let dX = drone.x;
    let dY = drone.y;
    let dir = drone.direction;
  
    switch (drone.behavior) {
      case 'horizontal':
        dX += dir * DRONE_SPEED_HORZ;
        if (dX < DRONE_BOUND_LEFT) {
          dX = DRONE_BOUND_LEFT;
          dir = 1;
        } else if (dX > DRONE_BOUND_RIGHT) {
          dX = DRONE_BOUND_RIGHT;
          dir = -1;
        }
        break;
      case 'vertical':
        dY += dir * DRONE_SPEED_VERT;
        if (dY < DRONE_BOUND_TOP) {
          dY = DRONE_BOUND_TOP;
          dir = 1;
        } else if (dY > DRONE_BOUND_BOTTOM) {
          dY = DRONE_BOUND_BOTTOM;
          dir = -1;
        }
        break;
      case 'diagonal':
        dX += dir * DRONE_SPEED_DIAG;
        dY += dir * DRONE_SPEED_DIAG;
        // bounce horizontally
        if (dX < DRONE_BOUND_LEFT) {
          dX = DRONE_BOUND_LEFT;
          dir = 1;
        } else if (dX > DRONE_BOUND_RIGHT) {
          dX = DRONE_BOUND_RIGHT;
          dir = -1;
        }
        // bounce vertically
        if (dY < DRONE_BOUND_TOP) {
          dY = DRONE_BOUND_TOP;
          dir = 1;
        } else if (dY > DRONE_BOUND_BOTTOM) {
          dY = DRONE_BOUND_BOTTOM;
          dir = -1;
        }
        break;
      default:
        break;
    }
  
    return { ...drone, x: dX, y: dY, direction: dir };
  }
  
  /* ----------------------------------------------------------------
     Collisions & Scoring
  ------------------------------------------------------------------ */
  
  /** Process stardust collisions => new score if collected. */
  function processStardust(
    stardust: Stardust[],
    score: number,
    sX: number,
    sY: number,
    ship: Ship
  ) {
    let updatedScore = score;
    const updatedDust = stardust.map(d => {
      if (!d.collected && collidesWithStardust(sX, sY, ship, d)) {
        updatedScore += 10;
        return { ...d, collected: true };
      }
      return d;
    });
    return [updatedDust, updatedScore] as const;
  }
  
  /** Check bounding-box vs. stardust center distance. */
  function collidesWithStardust(sX: number, sY: number, ship: Ship, dust: Stardust) {
    const dx = (sX + ship.width / 2) - dust.x;
    const dy = (sY + ship.height / 2) - dust.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < 20;
  }
  
  /** Generic bounding-box check. */
  function collides(
    sX: number,
    sY: number,
    w: number,
    h: number,
    x2: number,
    y2: number,
    w2: number,
    h2: number
  ) {
    return (
      sX + w > x2 &&
      sX < x2 + w2 &&
      sY + h > y2 &&
      sY < y2 + h2
    );
  }
  
  /** Check bounding-box vs. alien drone. */
  function collidesWithDrone(sX: number, sY: number, ship: Ship, drone: AlienDrone) {
    return collides(sX, sY, ship.width, ship.height, drone.x, drone.y, drone.width, drone.height);
  }
  
  /** Generate random stardust orbs. */
  function generateStardust(count: number): Stardust[] {
    const arr: Stardust[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        id: i,
        x: Math.random() * (SECTOR_WIDTH - 50) + 25,
        y: Math.random() * (SECTOR_HEIGHT - 100) + 50,
        collected: false
      });
    }
    return arr;
  }
  
  /** Clamp a value between min & max. */
  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(value, max));
  }
  
  /* ------------------ Drawing Helpers ------------------ */
  
  /** Render decorative planets. */
  function renderPlanets(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    PLANETS.forEach(planet => {
      ctx.fillText(planet.name, planet.x, planet.y - 10);
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = 'lime';
      ctx.fill();
    });
  }
  
  /** Render stardust orbs if not collected. */
  function renderStardust(ctx: CanvasRenderingContext2D, stardust: Stardust[]) {
    stardust.forEach(d => {
      if (!d.collected) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'yellow';
        ctx.fill();
      }
    });
  }
  
  /** Draw alien drone (emoji). */
  function drawAlienDrone(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.font = '40px Arial';
    ctx.fillStyle = 'red';
    ctx.textAlign = 'center';
    ctx.fillText('👾', x + 20, y + 30);
  }
  
  /** Render UI (Score & Hull & Boost timer). */
  function drawUI(ctx: CanvasRenderingContext2D, score: number, hull: number, boostTimer: number) {
    // Score
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Stardust: ${score}`, 10, 30);
  
    // Hull bar
    ctx.fillText('Hull:', 10, 60);
    ctx.fillStyle = '#666';
    ctx.fillRect(60, 50, 100, 10);
  
    const ratio = hull / MAX_HULL;
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(60, 50, 100 * ratio, 10);
  
    // Boost timer
    if (boostTimer > 0) {
      ctx.fillStyle = 'yellow';
      ctx.fillText(`Boost: ${boostTimer}`, 10, 90);
    }
  }
  
  /** Game Over overlay. */
  function renderGameOver(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, SECTOR_WIDTH, SECTOR_HEIGHT);
  
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', SECTOR_WIDTH / 2, SECTOR_HEIGHT / 2);
    ctx.font = '24px Arial';
    ctx.fillText('Press Restart to play again.', SECTOR_WIDTH / 2, SECTOR_HEIGHT / 2 + 40);
  }
  