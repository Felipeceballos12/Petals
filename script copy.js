// CONSTANTS
const PETAL_STATES = {
  VISIBLE: {
    cy: 50,
    rx: 20,
    ry: 30,
  },
  HIDDEN: {
    cy: 70,
    rx: 0,
    ry: 0,
  },
  RESET: {
    cx: 100,
    cy: 100,
    rx: 0,
    ry: 0,
  },
};

const NEW_PETAL_STATES = {
  VISIBLE: {
    transform: 'scale(1)',
  },
  HIDDEN: {
    transform: 'scale(0.47)',
  },
  RESET: {
    transform: 'scale(0)',
  },
};

const ANIMATION = {
  DURATION: 200,
  MIN_DURATION: 100,
  MAX_RADIUS: 20, // Used for calculating effective duration
};

const STATES = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSING: 'pausing',
  STOPPING: 'stopping',
};

const MODES = {
  REMOVE: 'remove',
  ADD: 'add',
};

// DOM ELEMENTS
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');

const PETALS = Array.from(document.getElementsByClassName('petal'));

// STATE VARIABLES
let animationState = STATES.IDLE;
let petalMode = MODES.REMOVE;
let currentPetalIndex = 0;

// use for debugging
function log() {
  console.log({ animationState, petalMode, currentPetalIndex });
}

function getTargetPetalPosition(mode) {
  return mode === MODES.REMOVE ? PETAL_STATES.HIDDEN : PETAL_STATES.VISIBLE;
}

function getCurrentPetalPosition(petal) {
  console.log({ petal });
  return {
    transform: parseFloat(petal.getAttribute('transform')),
  };
}

function updatePetalPosition(petal, state) {
  petal.setAttribute('transform', state.ry);
}

// calculates how long the animation of petal should be based on its position
function calculateAnimationDuration(startPosition, targetPosition) {
  const remainingRx = Math.abs(targetPosition.rx - startPosition.rx);
  const remainingRatio = remainingRx / ANIMATION.MAX_RADIUS;
  return Math.max(remainingRatio * ANIMATION.DURATION, ANIMATION.MIN_DURATION);
}

// calculates where the next position should be, based on start position, target position and current progress
function calculatePetalPosition(startPosition, targetPosition, progress) {
  return {
    cy: startPosition.cy + (targetPosition.cy - startPosition.cy) * progress,
  };
}

function animatePetal(petal) {
  return new Promise((resolve) => {
    // Cancel any existing animation
    if (petal.animationFrame !== null) {
      cancelAnimationFrame(petal.animationFrame);
      petal.animationFrame = null;
    }

    const startTime = Date.now();
    const startPosition = getCurrentPetalPosition(petal);
    const targetPosition = getTargetPetalPosition(petalMode);
    const animationDuration = calculateAnimationDuration(
      startPosition,
      targetPosition
    );

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      const currentPosition = calculatePetalPosition(
        startPosition,
        targetPosition,
        progress
      );
      updatePetalPosition(petal, currentPosition);

      if (progress < 1) {
        petal.animationFrame = requestAnimationFrame(animate);
      } else {
        // Ensure exact final state
        updatePetalPosition(petal, targetPosition);
        petal.animationFrame = null;
        cancelAnimationFrame(petal.animationFrame); // not sure if this is needed or not
        resolve();
      }
    }

    animate();
  });
}

async function forward() {
  while (animationState === STATES.PLAYING) {
    // removing petals
    if (petalMode === MODES.REMOVE) {
      if (currentPetalIndex < PETALS.length) {
        // remove petal
        await animatePetal(PETALS[currentPetalIndex]);
        currentPetalIndex++;
      } else {
        // switch petalMode and reset
        currentPetalIndex = 0;
        petalMode = MODES.ADD;
      }
    }
    // adding petals
    else if (petalMode === MODES.ADD) {
      if (currentPetalIndex < PETALS.length) {
        // add petals
        await animatePetal(PETALS[currentPetalIndex]);
        currentPetalIndex++;
      } else {
        // switch petalMode and reset
        currentPetalIndex = 0;
        petalMode = MODES.REMOVE;
      }
    }
  }
}

async function reverse() {
  while (animationState === STATES.STOPPING) {
    // adding petals
    if (petalMode === MODES.ADD) {
      if (currentPetalIndex >= 0) {
        // add petals anticlockwise
        await animatePetal(PETALS[currentPetalIndex]);
        currentPetalIndex--;
        log();
      } else {
        // all petals visible, stop animation
        setIdleState();
        currentPetalIndex = 0;
        console.log('All petals finished animating.');
        log();
      }
    }
    // removing petals
    else if (petalMode === MODES.REMOVE) {
      if (currentPetalIndex >= 0) {
        // remove petals anticlockwise
        await animatePetal(PETALS[currentPetalIndex]);
        currentPetalIndex--;
      } else {
        // switch mode and reset
        currentPetalIndex = PETALS.length - 1;
        petalMode = MODES.ADD;
      }
    }
  }
}

// these functions update animation state and button dom states for each action
function setIdleState() {
  animationState = STATES.IDLE;
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  stopBtn.disabled = true;
}
function setPlayingState() {
  animationState = STATES.PLAYING;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  stopBtn.disabled = false;
}
function setPausingState() {
  animationState = STATES.PAUSING;
  startBtn.disabled = true;
  stopBtn.disabled = false;
}
function setStoppingState() {
  animationState = STATES.STOPPING;
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  stopBtn.disabled = true;
}

startBtn.addEventListener('click', () => {
  if (animationState === STATES.IDLE) {
    setPlayingState();
    petalMode = MODES.REMOVE;
    forward();
    log();
  }
  if (animationState === STATES.STOPPING) {
    setPlayingState();
    petalMode = petalMode === MODES.ADD ? MODES.REMOVE : MODES.ADD;
    forward();
    log();
  }
});

/* 2. Pause Button
 * First Click:
 * Freeze the animation on the exact current frame.
 * Second Click (Resume):
 * Continue the animation clockwise from the paused state.
 * Stop After Pause:
 * If Stop is clicked while paused, reverse the animation (see Stop Button). */
pauseBtn.addEventListener('click', () => {
  /* const currentPetal = PETALS[currentPetalIndex];

  if (animationState === STATES.PLAYING) {
    // pause
    setPausingState();
    if (currentPetal.animationFrame !== null) {
      cancelAnimationFrame(currentPetal.animationFrame);
      currentPetal.animationFrame = null;
    }
    log();
  } else if (animationState === STATES.PAUSING) {
    // resume after pausing
    setPlayingState();
    forward();
    log();
  } */
});

/* ⠀3. Stop Button
 * Behavior:
 * Immediately halt the animation.
 * Reverse the petal sequence (counter-clockwise) until all petals return to their original state.
 * Interruption Handling:
 * If Play is clicked during the reverse (Stop) cycle:
 * Abort the reversal and resume the standard clockwise animation. */
stopBtn.addEventListener('click', () => {
  /* petalMode = petalMode === MODES.ADD ? MODES.REMOVE : MODES.ADD;

  if (animationState === STATES.PLAYING) {
    setStoppingState();
    reverse();
    log();
  } else if (animationState === STATES.PAUSING) {
    setStoppingState();
    reverse();
    log();
  } */
});
