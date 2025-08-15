import { Octree } from 'three/examples/jsm/math/Octree'
import { Capsule } from 'three/examples/jsm/math/Capsule'
import { Vector3 } from 'three'

// Virtual Joystick Class
class VirtualJoystick {
  constructor() {
    this.joystickContainer = document.createElement('div')
    this.joystick = document.createElement('div')
    this.setupJoystick()
    this.isActive = false
    this.direction = { x: 0, y: 0 }
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    if (this.isMobile) {
      this.show()
    }
  }

  setupJoystick() {
    // Container styling
    this.joystickContainer.style.cssText = `
      position: fixed;
      bottom: 50px;
      left: 50px;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      border: 2px solid rgba(255,255,255,0.5);
      z-index: 1000;
      display: none;
      touch-action: none;
    `

    // Joystick knob styling
    this.joystick.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255,255,255,0.8);
      transform: translate(-50%, -50%);
      transition: all 0.1s ease;
      pointer-events: none;
    `

    this.joystickContainer.appendChild(this.joystick)
    document.body.appendChild(this.joystickContainer)

    this.addEventListeners()
  }

  addEventListeners() {
    this.joystickContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
  }

  handleTouchStart(e) {
    // e.preventDefault()
    this.isActive = true
    const rect = this.joystickContainer.getBoundingClientRect()
    this.centerX = rect.left + rect.width / 2
    this.centerY = rect.top + rect.height / 2
  }

  handleTouchMove(e) {
    if (!this.isActive) return
    // e.preventDefault()

    const touch = e.touches[0]
    const deltaX = touch.clientX - this.centerX
    const deltaY = touch.clientY - this.centerY

    const distance = Math.min(30, Math.sqrt(deltaX * deltaX + deltaY * deltaY))
    const angle = Math.atan2(deltaY, deltaX)

    const knobX = Math.cos(angle) * distance
    const knobY = Math.sin(angle) * distance

    this.joystick.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`

    // Normalize direction values (-1 to 1)
    this.direction.x = knobX / 30
    this.direction.y = knobY / 30
  }

  handleTouchEnd(e) {
    // e.preventDefault()
    this.isActive = false
    this.joystick.style.transform = 'translate(-50%, -50%)'
    this.direction = { x: 0, y: 0 }
  }

  show() {
    this.joystickContainer.style.display = 'block'
  }

  hide() {
    this.joystickContainer.style.display = 'none'
  }

  getDirection() {
    return this.direction
  }
}

// Touch Look Controls Class
class TouchLookControls {
  constructor(camera, canvas = null) {
    this.camera = camera
    this.canvas = canvas // Pass your canvas/renderer domElement here
    this.isLooking = false
    this.previousTouch = { x: 0, y: 0 }
    this.sensitivity = 0.002
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    if (this.isMobile) {
      this.addEventListeners()
      this.setupMobileOptimizations()
    }
  }

  setupMobileOptimizations() {
    // Prevent zoom and improve touch handling
    document.addEventListener(
      'touchstart',
      function (e) {
        if (e.touches.length > 1) {
          e.preventDefault()
        }
      },
      { passive: false }
    )

    // Prevent context menu on long press
    document.addEventListener('contextmenu', function (e) {
      e.preventDefault()
    })

    // Add viewport meta tag if not present
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta')
      viewport.name = 'viewport'
      viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no'
      document.head.appendChild(viewport)
    }
  }

  addEventListeners() {
    // Target only the canvas if provided, otherwise use a more specific approach
    const target = this.canvas || document.body

    // Use capture phase to intercept before other handlers
    target.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false, capture: false })
    target.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false, capture: false })
    target.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false, capture: false })
  }

  handleTouchStart(e) {
    // If we have a canvas, only respond to touches on the canvas
    if (this.canvas && e.target !== this.canvas) {
      return
    }

    // For document.body, check if we should ignore this touch
    if (!this.canvas && this.shouldIgnoreTouch(e.touches[0])) {
      return
    }

    if (e.touches.length === 1) {
      e.preventDefault()
      this.isLooking = true
      this.previousTouch.x = e.touches[0].clientX
      this.previousTouch.y = e.touches[0].clientY
    }
  }

  shouldIgnoreTouch(touch) {
    // Get element at touch position
    const element = document.elementFromPoint(touch.clientX, touch.clientY)
    if (!element) return false

    // Check if touch is on joystick
    const joystick = document.querySelector('[style*="bottom: 50px"]')
    if (joystick && this.isTouchOverElement(touch, joystick)) {
      return true
    }

    // Check if element or any parent matches UI criteria
    let currentElement = element
    while (currentElement && currentElement !== document.body) {
      // Check tag name
      const tagName = currentElement.tagName.toLowerCase()
      if (['button', 'a', 'input', 'select', 'textarea'].includes(tagName)) {
        return true
      }

      // Check for UI-related classes or IDs
      const className = currentElement.className
      console.log('className', className)
      const id = currentElement.id

      if (typeof className === 'string') {
        if (
          className.includes('menu') ||
          className.includes('ui') ||
          className.includes('control') ||
          className.includes('button') ||
          className.includes('lil-gui')
        ) {
          return true
        }
      }

      if (typeof id === 'string') {
        if (id.includes('menu') || id.includes('ui') || id.includes('control')) {
          return true
        }
      }

      // Check for click handlers or role attributes
      if (
        currentElement.onclick ||
        currentElement.getAttribute('role') === 'button' ||
        currentElement.getAttribute('data-clickable') === 'true' ||
        currentElement.getAttribute('data-ui') === 'true'
      ) {
        return true
      }

      // Check for high z-index (likely UI elements)
      const zIndex = window.getComputedStyle(currentElement).zIndex
      if (zIndex && parseInt(zIndex) > 100) {
        return true
      }

      currentElement = currentElement.parentElement
    }

    return false
  }

  handleTouchMove(e) {
    if (!this.isLooking || e.touches.length !== 1) return

    // Don't prevent default if we're not actively looking
    // This allows scrolling and interaction with UI elements
    e.preventDefault()

    const touch = e.touches[0]
    const deltaX = touch.clientX - this.previousTouch.x
    const deltaY = touch.clientY - this.previousTouch.y

    // Rotate camera based on touch movement
    this.camera.rotation.y -= deltaX * this.sensitivity
    this.camera.rotation.x -= deltaY * this.sensitivity

    // Clamp vertical rotation to prevent flipping
    this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x))

    this.previousTouch.x = touch.clientX
    this.previousTouch.y = touch.clientY
  }

  handleTouchEnd(e) {
    this.isLooking = false
  }

  isTouchOverElement(touch, element) {
    const rect = element.getBoundingClientRect()
    return touch.clientX >= rect.left && touch.clientX <= rect.right && touch.clientY >= rect.top && touch.clientY <= rect.bottom
  }
}

function createPlayer(camera, geometry, canvas = null) {
  const GRAVITY = 30
  const STEPS_PER_FRAME = 5

  const worldOctree = new Octree()
  const playerCollider = new Capsule(new Vector3(0, 1.35, 15), new Vector3(0, 2.8, 15), 0.25)

  const playerVelocity = new Vector3()
  const playerDirection = new Vector3()

  let playerOnFloor = false
  let mouseTime = 0

  const keyStates = {}

  // Initialize mobile controls
  const virtualJoystick = new VirtualJoystick()
  const touchLookControls = new TouchLookControls(camera, canvas)

  // Desktop keyboard events
  document.addEventListener('keydown', (event) => {
    keyStates[event.code] = true
  })

  document.addEventListener('keyup', (event) => {
    keyStates[event.code] = false
  })

  document.addEventListener('mousedown', () => {
    // document.body.requestPointerLock();
    // mouseTime = performance.now();
  })

  // Desktop mouse look
  document.body.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === document.body) {
      camera.rotation.y -= event.movementX / 500
      camera.rotation.x -= event.movementY / 500
    }
  })

  function playerCollisions() {
    const result = worldOctree.capsuleIntersect(playerCollider)
    playerOnFloor = false

    if (result) {
      playerOnFloor = result.normal.y > 0

      if (!playerOnFloor) {
        playerVelocity.addScaledVector(result.normal, -result.normal.dot(playerVelocity))
      }

      playerCollider.translate(result.normal.multiplyScalar(result.depth))
    }
  }

  function updatePlayer(deltaTime) {
    let damping = Math.exp(-4 * deltaTime) - 1

    if (!playerOnFloor) {
      playerVelocity.y -= GRAVITY * deltaTime
      // small air resistance
      damping *= 0.1
    }

    playerVelocity.addScaledVector(playerVelocity, damping)

    const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime)
    playerCollider.translate(deltaPosition)

    playerCollisions()

    camera.position.copy(playerCollider.end)
  }

  function getForwardVector() {
    camera.getWorldDirection(playerDirection)
    playerDirection.y = 0
    playerDirection.normalize()
    return playerDirection
  }

  function getSideVector() {
    camera.getWorldDirection(playerDirection)
    playerDirection.y = 0
    playerDirection.normalize()
    playerDirection.cross(camera.up)
    return playerDirection
  }

  function controls(deltaTime) {
    // gives a bit of air control
    const speedDelta = deltaTime * (playerOnFloor ? 25 : 8)
    let movementDetected = false

    // Desktop keyboard controls
    if (keyStates['KeyW']) {
      playerVelocity.add(getForwardVector().multiplyScalar(speedDelta))
      movementDetected = true
    }

    if (keyStates['KeyS']) {
      playerVelocity.add(getForwardVector().multiplyScalar(-speedDelta))
      movementDetected = true
    }

    if (keyStates['KeyA']) {
      playerVelocity.add(getSideVector().multiplyScalar(-speedDelta))
      movementDetected = true
    }

    if (keyStates['KeyD']) {
      playerVelocity.add(getSideVector().multiplyScalar(speedDelta))
      movementDetected = true
    }

    // Mobile virtual joystick controls
    const joystickDirection = virtualJoystick.getDirection()
    if (Math.abs(joystickDirection.x) > 0.1 || Math.abs(joystickDirection.y) > 0.1) {
      // Forward/Backward movement (joystick Y becomes forward/backward)
      playerVelocity.add(getForwardVector().multiplyScalar(-joystickDirection.y * speedDelta))
      // Left/Right movement (joystick X becomes strafe)
      playerVelocity.add(getSideVector().multiplyScalar(joystickDirection.x * speedDelta))
      movementDetected = true
    }

    // Request pointer lock for desktop when moving
    if (movementDetected && !virtualJoystick.isMobile) {
      document.body.requestPointerLock()
    }

    // Jump controls (works for both desktop and mobile)
    if (playerOnFloor) {
      if (keyStates['Space']) {
        playerVelocity.y = 15
      }
    }
  }

  worldOctree.fromGraphNode(geometry)

  function teleportPlayerIfOob() {
    if (camera.position.y <= -25) {
      playerCollider.start.set(0, 1.35, 15)
      playerCollider.end.set(0, 2.8, 15)
      playerCollider.radius = 0.35
      camera.position.copy(playerCollider.end)
      camera.rotation.set(0, 0, 0)
    }
  }

  playerCollider.tick = (delta) => {
    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      const deltaTime = Math.min(0.05, delta) / STEPS_PER_FRAME
      controls(deltaTime)
      updatePlayer(deltaTime)
      teleportPlayerIfOob()
    }
  }

  // Add method to toggle mobile controls visibility
  playerCollider.showMobileControls = () => virtualJoystick.show()
  playerCollider.hideMobileControls = () => virtualJoystick.hide()

  return playerCollider
}

export { createPlayer }
