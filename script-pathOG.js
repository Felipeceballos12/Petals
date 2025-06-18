// CONSTANTS
const PETAL_STATES = {
  VISIBLE: {
    scale: 1,
    translateY: 0,
  },
  HIDDEN: {
    scale: 0.4,
    translateY: 20,
  },
  RESET: {
    scale: 0,
    translateY: 0,
  },
};

const ANIMATION = {
  DURATION: 1000,
  MIN_DURATION: 100,
  MAX_SCALE: 1, // Used for calculating effective duration
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
console.log({ PETALS });

// STATE VARIABLES
let animationState = STATES.IDLE;
let petalMode = MODES.REMOVE;
let currentPetalIndex = 0;

// TRANSFORM UTILITY FUNCTIONS
function parseTransform(transformString) {
  const scaleMatch = transformString.match(/scale\(([^)]+)\)/);
  const translateMatch = transformString.match(
    /translate\([^,)]*,\s*([^)]+)\)/
  ); // this will pull out both translateX and translateY but we only want translateY

  const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
  const translateY = translateMatch ? parseFloat(translateMatch[1]) : 0;

  return { scale, translateY };
}

// we set translateX to be 0px as it shouldn't be set to anything during this animation
function createTransformString(scale, translateY = 0) {
  return `scale(${scale}) translate(0px, ${translateY}px)`;
}

// use for debugging
function log() {
  console.log({ animationState, petalMode, currentPetalIndex });
}

function getTargetPetalTransform(mode) {
  return mode === MODES.REMOVE ? PETAL_STATES.HIDDEN : PETAL_STATES.VISIBLE;
}

function getCurrentPetalTransform(petal) {
  const transformString =
    petal.style.transform || petal.getAttribute('transform') || 'scale(1)';
  return parseTransform(transformString);
}

function updatePetalTransform(petal, transform) {
  const transformString = createTransformString(
    transform.scale,
    transform.translateY
  );
  petal.style.transform = transformString;
}

// calculates how long the animation of petal should be based on its transform
function calculateAnimationDuration(startTransform, targetTransform) {
  const remainingScale = Math.abs(targetTransform.scale - startTransform.scale);
  const remainingRatio = remainingScale / ANIMATION.MAX_SCALE;
  return Math.max(remainingRatio * ANIMATION.DURATION, ANIMATION.MIN_DURATION);
}

// calculates where the next transform should be, based on start transform, target transform and current progress
function calculatePetalTransform(startTransform, targetTransform, progress) {
  return {
    scale:
      startTransform.scale +
      (targetTransform.scale - startTransform.scale) * progress,
    translateY:
      startTransform.translateY +
      (targetTransform.translateY - startTransform.translateY) * progress,
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
    const startTransform = getCurrentPetalTransform(petal);
    const targetTransform = getTargetPetalTransform(petalMode);
    const animationDuration = calculateAnimationDuration(
      startTransform,
      targetTransform
    );
    console.log({ startTransform, targetTransform, animationDuration });

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      const currentTransform = calculatePetalTransform(
        startTransform,
        targetTransform,
        progress
      );
      console.log({ elapsed, progress, currentTransform });
      updatePetalTransform(petal, currentTransform);

      if (progress < 1) {
        petal.animationFrame = requestAnimationFrame(animate);
      } else {
        // Ensure exact final state
        updatePetalTransform(petal, targetTransform);
        petal.animationFrame = null;
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
 * Freeze the animation on the exact current frame.
 * Second Click (Resume):
 * Continue the animation clockwise from the paused state.
 * Stop After Pause:
 * If Stop is clicked while paused, reverse the animation (see Stop Button). */
pauseBtn.addEventListener('click', () => {
  const currentPetal = PETALS[currentPetalIndex];

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
  }
});

/* ⠀3. Stop Button
 * Behavior:
 * Immediately halt the animation.
 * Reverse the petal sequence (counter-clockwise) until all petals return to their original state.
 * Interruption Handling:
 * If Play is clicked during the reverse (Stop) cycle:
 * Abort the reversal and resume the standard clockwise animation. */
stopBtn.addEventListener('click', () => {
  petalMode = petalMode === MODES.ADD ? MODES.REMOVE : MODES.ADD;

  if (animationState === STATES.PLAYING) {
    setStoppingState();
    reverse();
    log();
  } else if (animationState === STATES.PAUSING) {
    setStoppingState();
    reverse();
    log();
  }
});
