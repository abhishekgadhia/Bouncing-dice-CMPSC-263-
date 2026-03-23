const app = document.getElementById("app");
const toggleBtn = document.getElementById("toggleBtn");
const snowContainer = document.getElementById("snow");

/* ----------------------------- SNOW ----------------------------- */
function createSnowflakes(count = 100) {
  snowContainer.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const flake = document.createElement("div");
    flake.className = "snowflake";

    const size = Math.random() * 5 + 2;
    const left = Math.random() * 100;
    const duration = Math.random() * 8 + 8;
    const delay = Math.random() * -16;
    const drift = `${Math.random() * 120 - 60}px`;

    flake.style.width = `${size}px`;
    flake.style.height = `${size}px`;
    flake.style.left = `${left}vw`;
    flake.style.animationDuration = `${duration}s`;
    flake.style.animationDelay = `${delay}s`;
    flake.style.setProperty("--drift", drift);

    snowContainer.appendChild(flake);
  }
}
createSnowflakes();

/* --------------------------- THREE SETUP --------------------------- */
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 6);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
app.appendChild(renderer.domElement);

/* ---------------------------- LIGHTING ---------------------------- */
const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(3, 5, 5);
dirLight.castShadow = true;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0xdff4ff, 0.8);
fillLight.position.set(-4, 2, 4);
scene.add(fillLight);

/* ----------------------------- SHADOW ----------------------------- */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.ShadowMaterial({ opacity: 0.18 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.4;
ground.receiveShadow = true;
scene.add(ground);

/* ------------------------------ DICE ------------------------------ */
const diceGroup = new THREE.Group();
scene.add(diceGroup);

const diceSize = 0.85;
const diceBody = new THREE.Mesh(
  new THREE.BoxGeometry(diceSize, diceSize, diceSize),
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.02
  })
);
diceBody.castShadow = true;
diceBody.receiveShadow = true;
diceGroup.add(diceBody);

const pipMaterial = new THREE.MeshStandardMaterial({
  color: 0x111111,
  roughness: 0.45,
  metalness: 0.02
});

function addPip(x, y, z, rx, ry) {
  const pip = new THREE.Mesh(
    new THREE.CircleGeometry(0.06, 24),
    pipMaterial
  );
  pip.position.set(x, y, z);
  pip.rotation.x = rx || 0;
  pip.rotation.y = ry || 0;
  diceGroup.add(pip);
}

const o = 0.18;
const f = diceSize / 2 + 0.002;

/* front = 1 */
addPip(0, 0, f, 0, 0);

/* back = 6 */
addPip(-o,  o, -f, 0, Math.PI);
addPip( o,  o, -f, 0, Math.PI);
addPip(-o,  0, -f, 0, Math.PI);
addPip( o,  0, -f, 0, Math.PI);
addPip(-o, -o, -f, 0, Math.PI);
addPip( o, -o, -f, 0, Math.PI);

/* right = 2 */
addPip(f,  o, -o, 0, Math.PI / 2);
addPip(f, -o,  o, 0, Math.PI / 2);

/* left = 5 */
addPip(-f,  o, -o, 0, -Math.PI / 2);
addPip(-f,  o,  o, 0, -Math.PI / 2);
addPip(-f,  0,  0, 0, -Math.PI / 2);
addPip(-f, -o, -o, 0, -Math.PI / 2);
addPip(-f, -o,  o, 0, -Math.PI / 2);

/* top = 3 */
addPip(-o, f, -o, -Math.PI / 2, 0);
addPip( 0, f,  0, -Math.PI / 2, 0);
addPip( o, f,  o, -Math.PI / 2, 0);

/* bottom = 4 */
addPip(-o, -f, -o, Math.PI / 2, 0);
addPip( o, -f, -o, Math.PI / 2, 0);
addPip(-o, -f,  o, Math.PI / 2, 0);
addPip( o, -f,  o, Math.PI / 2, 0);

/* ----------------------- MOTION / INTERACTION ----------------------- */
let running = true;
let dragging = false;
let stopped = false;

let velocity = new THREE.Vector2(0.015, 0.012);
let targetVelocity = new THREE.Vector2(0.015, 0.012);
let angularVelocity = new THREE.Vector3(0.02, 0.024, 0.008);

const bounds = { x: 2.9, y: 1.8 };

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const dragOffset = new THREE.Vector3();
let lastDragTime = 0;
let releaseVelocity = new THREE.Vector2();

function updateBounds() {
  const visibleHeight =
    2 * Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
  const visibleWidth = visibleHeight * camera.aspect;

  bounds.x = visibleWidth / 2 - 0.55;
  bounds.y = visibleHeight / 2 - 0.55;
}
updateBounds();

function setMouse(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function getPlanePoint(event) {
  setMouse(event);
  raycaster.setFromCamera(mouse, camera);
  return raycaster.ray.intersectPlane(dragPlane, new THREE.Vector3());
}

const faceRotations = {
  1: { x: 0, y: 0, z: 0 },
  2: { x: 0, y: -Math.PI / 2, z: 0 },
  3: { x: -Math.PI / 2, y: 0, z: 0 },
  4: { x: Math.PI / 2, y: 0, z: 0 },
  5: { x: 0, y: Math.PI / 2, z: 0 },
  6: { x: 0, y: Math.PI, z: 0 }
};

function showRandomFaceCentered() {
  const face = Math.floor(Math.random() * 6) + 1;
  const rot = faceRotations[face];

  diceGroup.position.set(0, 0, 0);
  diceGroup.rotation.set(rot.x, rot.y, rot.z);
  velocity.set(0, 0);
  targetVelocity.set(0, 0);
  angularVelocity.set(0, 0, 0);
}

function resumeMotion() {
  const vx = (Math.random() * 0.012 + 0.01) * (Math.random() > 0.5 ? 1 : -1);
  const vy = (Math.random() * 0.01 + 0.009) * (Math.random() > 0.5 ? 1 : -1);
  velocity.set(vx, vy);
  targetVelocity.copy(velocity);
  angularVelocity.set(0.02, 0.024, 0.008);
  running = true;
  stopped = false;
}

window.addEventListener("pointerdown", (event) => {
  setMouse(event);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(diceBody);

  if (!hits.length) return;

  if (stopped) {
    resumeMotion();
  }

  dragging = true;
  const point = getPlanePoint(event);
  if (point) {
    dragOffset.copy(diceGroup.position).sub(point);
    lastDragTime = performance.now();
  }
  document.body.style.cursor = "grabbing";
});

window.addEventListener("pointermove", (event) => {
  if (!dragging) return;

  const point = getPlanePoint(event);
  if (!point) return;

  const now = performance.now();
  const dt = Math.max((now - lastDragTime) / 1000, 0.001);

  const next = point.clone().add(dragOffset);
  next.x = THREE.MathUtils.clamp(next.x, -bounds.x, bounds.x);
  next.y = THREE.MathUtils.clamp(next.y, -bounds.y, bounds.y);

  const prev = diceGroup.position.clone();
  diceGroup.position.copy(next);

  releaseVelocity.set(
    (diceGroup.position.x - prev.x) / dt,
    (diceGroup.position.y - prev.y) / dt
  );

  lastDragTime = now;
});

window.addEventListener("pointerup", () => {
  if (!dragging) return;

  dragging = false;
  document.body.style.cursor = "default";

  velocity.copy(releaseVelocity);
  velocity.x = THREE.MathUtils.clamp(velocity.x, -2, 2) * 0.014;
  velocity.y = THREE.MathUtils.clamp(velocity.y, -2, 2) * 0.014;

  if (Math.abs(velocity.x) < 0.008) {
    velocity.x = (Math.random() * 0.012 + 0.01) * (Math.random() > 0.5 ? 1 : -1);
  }
  if (Math.abs(velocity.y) < 0.008) {
    velocity.y = (Math.random() * 0.012 + 0.01) * (Math.random() > 0.5 ? 1 : -1);
  }

  targetVelocity.copy(velocity);
  angularVelocity.set(
    0.016 + Math.abs(velocity.y) * 0.3,
    0.018 + Math.abs(velocity.x) * 0.3,
    0.006
  );

  running = true;
  stopped = false;
});

toggleBtn.addEventListener("click", () => {
  dragging = false;
  document.body.style.cursor = "default";
  running = false;
  stopped = true;
  toggleBtn.textContent = "Stop Dice";
  showRandomFaceCentered();
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateBounds();
});

/* ---------------------------- ANIMATE ---------------------------- */
const clock = new THREE.Clock();
resumeMotion();

function animate() {
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime();

  if (running) {
    if (!dragging) {
      targetVelocity.x += Math.sin(t * 1.1) * 0.00003;
      targetVelocity.y += Math.cos(t * 1.3) * 0.00003;

      targetVelocity.x = THREE.MathUtils.clamp(targetVelocity.x, -0.025, 0.025);
      targetVelocity.y = THREE.MathUtils.clamp(targetVelocity.y, -0.025, 0.025);

      velocity.lerp(targetVelocity, 0.02);

      diceGroup.position.x += velocity.x;
      diceGroup.position.y += velocity.y;

      if (diceGroup.position.x >= bounds.x || diceGroup.position.x <= -bounds.x) {
        diceGroup.position.x = THREE.MathUtils.clamp(diceGroup.position.x, -bounds.x, bounds.x);
        velocity.x *= -1;
        targetVelocity.x = velocity.x;
      }

      if (diceGroup.position.y >= bounds.y || diceGroup.position.y <= -bounds.y) {
        diceGroup.position.y = THREE.MathUtils.clamp(diceGroup.position.y, -bounds.y, bounds.y);
        velocity.y *= -1;
        targetVelocity.y = velocity.y;
      }

      diceGroup.rotation.x += angularVelocity.x;
      diceGroup.rotation.y += angularVelocity.y;
      diceGroup.rotation.z += angularVelocity.z;
    }
  }

  ground.position.x = diceGroup.position.x * 0.3;
  ground.position.z = -diceGroup.position.y * 0.2;

  renderer.render(scene, camera);
}

animate();