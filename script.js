// CONSTANTS
const PETAL_STATES = {
  VISIBLE: {
    scale: 1,
    translateY: 0,
    opacity: 1,
  },
  HIDDEN: {
    scale: 0.4,
    translateY: 0,
    opacity: 0,
  },
  RESET: {
    scale: 0,
    translateY: 0,
    opacity: 1,
  },
};

const ANIMATION = {
  DURATION: 200,
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
  const translateMatch = transformString.match(/translate\(([^)]+)\)/);

  const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
  const translateValues = translateMatch
    ? translateMatch[1].split(',').map((v) => parseFloat(v.trim()))
    : [0, 0];

  return {
    scale: scale,
    translateX: translateValues[0] || 0,
    translateY: translateValues[1] || 0,
  };
}

function createTransformString(scale, translateX = 0, translateY = 0) {
  return `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
}

function calculateOpacity(currentScale, mode) {
  if (mode === MODES.ADD) {
    // Opacity starts changing when scale < 0.8
    if (currentScale <= 0.7) {
      return 1;
    } else {
      // Map scale from 0 to 0.8 → opacity from 0 to 1
      return Math.max(0, currentScale / 0.8);
    }
  } else if (mode === MODES.REMOVE) {
    // Opacity starts changing when scale > 0.5
    if (currentScale >= 0.8) {
      return 0;
    } else {
      // Map scale from 0.5 to 1 → opacity from 0 to 1
      return Math.min(1, (currentScale - 0.8) / 0.8);
    }
  }
  return 1;
}

function interpolateTransforms(start, end, progress) {
  const currentScale = start.scale + (end.scale - start.scale) * progress;
  console.log('Current Scale: ', currentScale);
  const opacity = calculateOpacity(currentScale, petalMode);
  console.log({ opacity });

  return {
    scale: currentScale,
    translateX:
      start.translateX + (end.translateX - start.translateX) * progress,
    translateY:
      start.translateY + (end.translateY - start.translateY) * progress,
    opacity: opacity,
  };
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
  const transform = parseTransform(transformString);
  const opacity = parseFloat(petal.style.opacity) || 0;

  return {
    ...transform,
    opacity: opacity,
  };
}

function updatePetalTransform(petal, transform) {
  const transformString = createTransformString(
    transform.scale,
    transform.translateX,
    transform.translateY
  );
  petal.style.transform = transformString;
  petal.style.opacity = transform.opacity;
}

// calculates how long the animation of petal should be based on its transform
function calculateAnimationDuration(startTransform, targetTransform) {
  const remainingScale = Math.abs(targetTransform.scale - startTransform.scale);
  const remainingRatio = remainingScale / ANIMATION.MAX_SCALE;
  return Math.max(remainingRatio * ANIMATION.DURATION, ANIMATION.MIN_DURATION);
}

function interpolateTransforms(start, end, progress) {
  const currentScale = start.scale + (end.scale - start.scale) * progress;
  console.log('Current Scale: ', currentScale);
  const opacity = calculateOpacity(currentScale, petalMode);
  console.log({ opacity });

  return {
    scale: currentScale,
    translateX:
      start.translateX + (end.translateX - start.translateX) * progress,
    translateY:
      start.translateY + (end.translateY - start.translateY) * progress,
    opacity: opacity,
  };
}

// calculates where the next transform should be, based on start transform, target transform and current progress
function calculatePetalTransform(startTransform, targetTransform, progress) {
  const currentScale =
    startTransform.scale +
    (targetTransform.scale - startTransform.scale) * progress;
  console.log('Current Scale: ', currentScale);
  const opacity = calculateOpacity(currentScale, petalMode);
  console.log({ opacity });

  return {
    scale: currentScale,
    translateX:
      startTransform.translateX +
      (targetTransform.translateX - startTransform.translateX) * progress,
    translateY:
      startTransform.translateY +
      (targetTransform.translateY - startTransform.translateY) * progress,
    opacity: opacity,
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
    console.log({
      startTransform,
      targetTransform,
      animationDuration,
      petalMode,
    });

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      const currentTransform = calculatePetalTransform(
        startTransform,
        targetTransform,
        progress
      );
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
