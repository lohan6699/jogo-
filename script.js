// === Variáveis do jogo ===
let score = 0;
let isLocked = false;
const balloons = [];
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

// === Cena, câmera e renderer ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 80);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// === Luzes ===
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// === Chão ===
const floorGeo = new THREE.PlaneGeometry(200, 200);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// === Criar balão ===
function createBalloon() {
  const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const geo = new THREE.SphereGeometry(0.8, 16, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.3,
    metalness: 0.1
  });
  const balloon = new THREE.Mesh(geo, mat);

  balloon.position.set(
    (Math.random() - 0.5) * 40,
    2 + Math.random() * 6,
    (Math.random() - 0.5) * 40
  );

  balloon.userData = {
    speed: 0.01 + Math.random() * 0.02,
    originalY: balloon.position.y
  };

  scene.add(balloon);
  balloons.push(balloon);
}

// Criar balões iniciais
for (let i = 0; i < 12; i++) {
  createBalloon();
}

// === Controles de teclado ===
document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyD': moveRight = false; break;
  }
});

// === Pointer Lock (mouse) ===
const instructions = document.getElementById('instructions');
const crosshair = document.getElementById('crosshair');

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

  yaw -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;
  pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));

  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
});

// === Atirar ===
const raycaster = new THREE.Raycaster();

document.addEventListener('mousedown', (e) => {
  if (!isLocked || e.button !== 0) return;

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObjects(balloons);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    scene.remove(hit);

    const index = balloons.indexOf(hit);
    if (index > -1) {
      balloons.splice(index, 1);
    }

    score += 10;
    document.getElementById('score').textContent = score;

    // Criar novo balão depois de meio segundo
    setTimeout(createBalloon, 500);
  }
});

// === Loop de animação ===
function animate() {
  requestAnimationFrame(animate);

  // Movimento do jogador
  const direction = new THREE.Vector3();
  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();

  const speed = 0.15;

  if (moveForward || moveBackward) {
    camera.position.x -= direction.z * Math.sin(yaw) * speed;
    camera.position.z -= direction.z * Math.cos(yaw) * speed;
  }
  if (moveLeft || moveRight) {
    camera.position.x += direction.x * Math.cos(yaw) * speed;
    camera.position.z -= direction.x * Math.sin(yaw) * speed;
  }

  // Manter altura fixa
  camera.position.y = 1.6;

  // Animar balões (flutuando)
  balloons.forEach((b) => {
    b.position.y = b.userData.originalY + Math.sin(Date.now() * b.userData.speed) * 0.5;
    b.rotation.y += 0.01;
  });

  renderer.render(scene, camera);
}

animate();

// Redimensionar a tela
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});