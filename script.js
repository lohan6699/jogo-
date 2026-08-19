// ====================== VARIÁVEIS ======================
let score = 0;
let combo = 0;
let highScore = localStorage.getItem('highScore') || 0;
let isLocked = false;
let canJump = true;
let velocityY = 0;

const balloons = [];
const particles = [];
const trees = [];

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false
};

// ====================== CENA ======================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 25, 90);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.7, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ====================== LUZES ======================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(15, 30, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

// ====================== CHÃO ======================
const floorGeo = new THREE.PlaneGeometry(120, 120);
const floorMat = new THREE.MeshStandardMaterial({ 
  color: 0x4caf50,
  roughness: 0.8
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ====================== ÁRVORES SIMPLES ======================
function createTree(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.4, 2.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x8B4513 })
  );
  trunk.position.set(x, 1.25, z);
  trunk.castShadow = true;

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(1.8, 3.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
  );
  leaves.position.set(x, 3.8, z);
  leaves.castShadow = true;

  scene.add(trunk);
  scene.add(leaves);
  trees.push(trunk, leaves);
}

// Criar algumas árvores
for (let i = 0; i < 18; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 18 + Math.random() * 25;
  createTree(Math.cos(angle) * radius, Math.sin(angle) * radius);
}

// ====================== CRIAR BALÃO ======================
function createBalloon() {
  const types = [
    { size: 0.55, points: 10, color: 0xff5252 },   // pequeno
    { size: 0.8,  points: 20, color: 0x448aff },   // médio
    { size: 1.15, points: 40, color: 0xffeb3b },   // grande
    { size: 0.7,  points: 15, color: 0x69f0ae }    // médio-verde
  ];

  const type = types[Math.floor(Math.random() * types.length)];

  const geo = new THREE.SphereGeometry(type.size, 16, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: type.color,
    roughness: 0.25,
    metalness: 0.15
  });

  const balloon = new THREE.Mesh(geo, mat);
  balloon.castShadow = true;

  balloon.position.set(
    (Math.random() - 0.5) * 45,
    2.5 + Math.random() * 7,
    (Math.random() - 0.5) * 45
  );

  balloon.userData = {
    points: type.points,
    speed: 0.008 + Math.random() * 0.015,
    originalY: balloon.position.y,
    size: type.size
  };

  scene.add(balloon);
  balloons.push(balloon);
}

// Balões iniciais
for (let i = 0; i < 15; i++) createBalloon();

// ====================== PARTÍCULAS ======================
function createExplosion(position, color) {
  for (let i = 0; i < 14; i++) {
    const geo = new THREE.SphereGeometry(0.12, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: color });
    const p = new THREE.Mesh(geo, mat);

    p.position.copy(position);
    p.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.25,
        Math.random() * 0.2,
        (Math.random() - 0.5) * 0.25
      ),
      life: 1.0
    };

    scene.add(p);
    particles.push(p);
  }
}

// ====================== CONTROLES ======================
document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': keys.forward = true; break;
    case 'KeyS': keys.backward = true; break;
    case 'KeyA': keys.left = true; break;
    case 'KeyD': keys.right = true; break;
    case 'Space': 
      if (canJump) {
        velocityY = 0.22;
        canJump = false;
      }
      break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': keys.forward = false; break;
    case 'KeyS': keys.backward = false; break;
    case 'KeyA': keys.left = false; break;
    case 'KeyD': keys.right = false; break;
  }
});

// ====================== POINTER LOCK ======================
const instructions = document.getElementById('instructions');
const crosshair = document.getElementById('crosshair');
const gameoverEl = document.getElementById('gameover');

instructions.addEventListener('click', () => {
  document.body.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === document.body) {
    isLocked = true;
    instructions.style.display = 'none';
    crosshair.style.display = 'block';
  } else {
    isLocked = false;
    instructions.style.display = 'block';
    crosshair.style.display = 'none';
  }
});

// Rotação da câmera
let yaw = 0;
let pitch = 0;

document.addEventListener('mousemove', (e) => {
  if (!isLocked) return;

  yaw -= e.movementX * 0.0022;
  pitch -= e.movementY * 0.0022;
  pitch = Math.max(-1.4, Math.min(1.4, pitch));

  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
});

// ====================== ATIRAR ======================
const raycaster = new THREE.Raycaster();

document.addEventListener('mousedown', (e) => {
  if (!isLocked || e.button !== 0) return;

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObjects(balloons);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    const points = hit.userData.points;

    // Efeito de explosão
    createExplosion(hit.position.clone(), hit.material.color.getHex());

    // Remover balão
    scene.remove(hit);
    const index = balloons.indexOf(hit);
    if (index > -1) balloons.splice(index, 1);

    // Pontuação + combo
    combo++;
    score += points * Math.min(combo, 5); // combo até 5x
    document.getElementById('score').textContent = score;
    document.getElementById('combo').textContent = combo;

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('highScore', highScore);
      document.getElementById('highscore').textContent = highScore;
    }

    // Novo balão
    setTimeout(createBalloon, 400 + Math.random() * 600);
  } else {
    // Errou → quebra o combo
    combo = 0;
    document.getElementById('combo').textContent = 0;
  }
});

// ====================== REINICIAR ======================
document.getElementById('restart-btn').addEventListener('click', () => {
  // Limpar balões
  balloons.forEach(b => scene.remove(b));
  balloons.length = 0;

  // Limpar partículas
  particles.forEach(p => scene.remove(p));
  particles.length = 0;

  score = 0;
  combo = 0;
  document.getElementById('score').textContent = 0;
  document.getElementById('combo').textContent = 0;

  for (let i = 0; i < 15; i++) createBalloon();

  gameoverEl.classList.add('hidden');
  document.body.requestPointerLock();
});

// Atualizar recorde na tela
document.getElementById('highscore').textContent = highScore;

// ====================== LOOP PRINCIPAL ======================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  // ===== Movimento =====
  const speed = 12 * delta;
  const direction = new THREE.Vector3();

  direction.z = Number(keys.forward) - Number(keys.backward);
  direction.x = Number(keys.right) - Number(keys.left);
  direction.normalize();

  if (keys.forward || keys.backward) {
    camera.position.x -= direction.z * Math.sin(yaw) * speed;
    camera.position.z -= direction.z * Math.cos(yaw) * speed;
  }
  if (keys.left || keys.right) {
    camera.position.x += direction.x * Math.cos(yaw) * speed;
    camera.position.z -= direction.x * Math.sin(yaw) * speed;
  }

  // Gravidade e pulo
  velocityY -= 0.012;
  camera.position.y += velocityY;

  if (camera.position.y <= 1.7) {
    camera.position.y = 1.7;
    velocityY = 0;
    canJump = true;
  }

  // ===== Animar balões =====
  balloons.forEach(b => {
    b.position.y = b.userData.originalY + Math.sin(Date.now() * b.userData.speed) * 0.6;
    b.rotation.y += 0.008;
  });

  // ===== Atualizar partículas =====
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.position.add(p.userData.velocity);
    p.userData.velocity.y -= 0.008;
    p.userData.life -= 0.025;

    p.scale.setScalar(p.userData.life);
    p.material.opacity = p.userData.life;

    if (p.userData.life <= 0) {
      scene.remove(p);
      particles.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}

animate();

// Redimensionar
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});