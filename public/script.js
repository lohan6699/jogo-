// ====================== CONEXÃO ======================
const socket = io();

let myId = null;
let myName = '';
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let isLocked = false;
let canJump = true;
let velocityY = 0;
let isChatting = false;

const otherPlayers = {};
const balloonMeshes = {};
const particles = [];

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false
};

// ====================== CENA ======================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8f0);
scene.fog = new THREE.Fog(0x7ec8f0, 30, 100);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.7, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ====================== ILUMINAÇÃO ======================
const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x88aa66, 0.55);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfff5e0, 1.05);
dirLight.position.set(20, 35, 15);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 80;
dirLight.shadow.camera.left = -40;
dirLight.shadow.camera.right = 40;
dirLight.shadow.camera.top = 40;
dirLight.shadow.camera.bottom = -40;
dirLight.shadow.bias = -0.001;
scene.add(dirLight);

// Sol
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(3, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xfff3c0 })
);
sun.position.set(40, 50, -30);
scene.add(sun);

// ====================== CHÃO ======================
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(140, 140),
  new THREE.MeshStandardMaterial({
    color: 0x4caf50,
    roughness: 0.85,
    metalness: 0.05
  })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ====================== ÁRVORES ======================
function createTree(x, z, scale = 1) {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25 * scale, 0.35 * scale, 2.2 * scale, 8),
    new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9 })
  );
  trunk.position.y = 1.1 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  const leafColors = [0x2e7d32, 0x388e3c, 0x43a047];
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry((1.6 - i * 0.25) * scale, 2.2 * scale, 8),
      new THREE.MeshStandardMaterial({
        color: leafColors[i],
        roughness: 0.8
      })
    );
    leaf.position.y = (2.8 + i * 1.3) * scale;
    leaf.castShadow = true;
    group.add(leaf);
  }

  group.position.set(x, 0, z);
  scene.add(group);
}

for (let i = 0; i < 22; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 16 + Math.random() * 30;
  const scale = 0.8 + Math.random() * 0.6;
  createTree(Math.cos(angle) * radius, Math.sin(angle) * radius, scale);
}

// ====================== JOGADORES ======================
function createPlayerMesh(color) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 0.7, 6, 10),
    new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.4,
      metalness: 0.1
    })
  );
  body.position.y = 0.85;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 14, 14),
    new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.35
    })
  );
  head.position.y = 1.55;
  head.castShadow = true;
  group.add(head);

  // Olhos
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
  eyeL.position.set(-0.09, 1.58, 0.22);
  group.add(eyeL);

  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
  eyeR.position.set(0.09, 1.58, 0.22);
  group.add(eyeR);

  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), pupilMat);
  pupilL.position.set(-0.09, 1.58, 0.27);
  group.add(pupilL);

  const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), pupilMat);
  pupilR.position.set(0.09, 1.58, 0.27);
  group.add(pupilR);

  return group;
}

function updatePlayerList() {
  const count = Object.keys(otherPlayers).length + 1;
  document.getElementById('player-count').textContent = count;
}

// ====================== BALÕES ======================
function createBalloonMesh(data) {
  const group = new THREE.Group();

  const balloon = new THREE.Mesh(
    new THREE.SphereGeometry(data.size, 20, 20),
    new THREE.MeshStandardMaterial({
      color: data.color,
      roughness: 0.2,
      metalness: 0.15,
      emissive: data.color,
      emissiveIntensity: 0.08
    })
  );
  balloon.castShadow = true;
  group.add(balloon);

  // Cordinha
  const string = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, data.size * 1.4, 6),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 })
  );
  string.position.y = -data.size * 1.15;
  group.add(string);

  group.position.set(data.x, data.y, data.z);
  group.userData = {
    id: data.id,
    points: data.points,
    speed: data.speed,
    originalY: data.y,
    size: data.size
  };

  return group;
}

// ====================== PARTÍCULAS ======================
function createExplosion(position, color) {
  for (let i = 0; i < 18; i++) {
    const size = 0.08 + Math.random() * 0.12;
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(size, 6, 6),
      new THREE.MeshBasicMaterial({
        color: color,
        transparent: true
      })
    );
    p.position.copy(position);
    p.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.32,
        Math.random() * 0.28,
        (Math.random() - 0.5) * 0.32
      ),
      life: 1.0
    };
    scene.add(p);
    particles.push(p);
  }
}

// ====================== CHAT ======================
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');

function addChatMessage(name, message, isSystem = false) {
  const div = document.createElement('div');
  div.className = `message ${isSystem ? 'system' : 'player'}`;
  div.innerHTML = `<span class="name">${name}:</span> ${message}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  while (chatMessages.children.length > 40) {
    chatMessages.removeChild(chatMessages.firstChild);
  }
}

function openChat() {
  if (isChatting) return;
  isChatting = true;
  chatInput.style.display = 'block';
  chatInput.value = '';
  chatInput.focus();
  if (document.pointerLockElement) document.exitPointerLock();
}

function closeChat() {
  isChatting = false;
  chatInput.style.display = 'none';
  chatInput.blur();
}

function sendChatMessage() {
  const text = chatInput.value.trim();
  if (text.length > 0) socket.emit('chatMessage', text);
  closeChat();
}

// ====================== SOCKET ======================
socket.on('init', (data) => {
  myId = data.id;
  myName = data.name;

  data.balloons.forEach(b => {
    const mesh = createBalloonMesh(b);
    scene.add(mesh);
    balloonMeshes[b.id] = mesh;
  });

  for (const id in data.players) {
    if (id === myId) continue;
    const p = data.players[id];
    const mesh = createPlayerMesh(p.color);
    mesh.position.set(p.x, p.y, p.z);
    scene.add(mesh);
    otherPlayers[id] = { mesh, ...p };
  }

  updatePlayerList();
  addChatMessage('Sistema', `Bem-vindo, ${myName}!`, true);
});

socket.on('playerJoined', (player) => {
  if (player.id === myId) return;
  const mesh = createPlayerMesh(player.color);
  mesh.position.set(player.x, player.y, player.z);
  scene.add(mesh);
  otherPlayers[player.id] = { mesh, ...player };
  updatePlayerList();
});

socket.on('playerMoved', (data) => {
  const p = otherPlayers[data.id];
  if (!p) return;
  p.mesh.position.set(data.x, data.y, data.z);
  p.mesh.rotation.y = data.yaw;
});

socket.on('playerLeft', (id) => {
  if (otherPlayers[id]) {
    scene.remove(otherPlayers[id].mesh);
    delete otherPlayers[id];
    updatePlayerList();
  }
});

socket.on('balloonRemoved', (data) => {
  const mesh = balloonMeshes[data.id];
  if (mesh) {
    createExplosion(mesh.position.clone(), mesh.children[0].material.color.getHex());
    scene.remove(mesh);
    delete balloonMeshes[data.id];
  }

  if (data.hitterId === myId) {
    score = data.newScore;
    document.getElementById('score').textContent = score;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('highScore', highScore);
      document.getElementById('highscore').textContent = highScore;
    }
  }
});

socket.on('balloonAdded', (data) => {
  const mesh = createBalloonMesh(data);
  scene.add(mesh);
  balloonMeshes[data.id] = mesh;
});

socket.on('chatMessage', (data) => {
  addChatMessage(data.name, data.message, data.isSystem);
});

// ====================== CONTROLES ======================
document.addEventListener('keydown', (e) => {
  if (isChatting) {
    if (e.code === 'Enter') {
      e.preventDefault();
      sendChatMessage();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      closeChat();
    }
    return;
  }

  if (e.code === 'Enter') {
    e.preventDefault();
    openChat();
    return;
  }

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
  if (isChatting) return;
  switch (e.code) {
    case 'KeyW': keys.forward = false; break;
    case 'KeyS': keys.backward = false; break;
    case 'KeyA': keys.left = false; break;
    case 'KeyD': keys.right = false; break;
  }
});

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
    crosshair.style.display = 'none';
    if (!isChatting) instructions.style.display = 'block';
  }
});

let yaw = 0;
let pitch = 0;

document.addEventListener('mousemove', (e) => {
  if (!isLocked || isChatting) return;
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
  if (!isLocked || isChatting || e.button !== 0) return;

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const meshes = Object.values(balloonMeshes);
  const intersects = raycaster.intersectObjects(meshes, true);

  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj.parent && !obj.userData.id) {
      obj = obj.parent;
    }
    if (obj.userData.id) {
      socket.emit('hitBalloon', obj.userData.id);
    }
  }
});

// ====================== LOOP ======================
const clock = new THREE.Clock();
let lastUpdate = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const now = Date.now();

  if (!isChatting) {
    const speed = 12 * delta;
    const dir = new THREE.Vector3();
    dir.z = Number(keys.forward) - Number(keys.backward);
    dir.x = Number(keys.right) - Number(keys.left);
    dir.normalize();

    if (keys.forward || keys.backward) {
      camera.position.x -= dir.z * Math.sin(yaw) * speed;
      camera.position.z -= dir.z * Math.cos(yaw) * speed;
    }
    if (keys.left || keys.right) {
      camera.position.x += dir.x * Math.cos(yaw) * speed;
      camera.position.z -= dir.x * Math.sin(yaw) * speed;
    }

    velocityY -= 0.012;
    camera.position.y += velocityY;
    if (camera.position.y <= 1.7) {
      camera.position.y = 1.7;
      velocityY = 0;
      canJump = true;
    }

    if (now - lastUpdate > 50) {
      socket.emit('update', {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        yaw: yaw,
        pitch: pitch
      });
      lastUpdate = now;
    }
  }

  // Animar balões
  for (const id in balloonMeshes) {
    const b = balloonMeshes[id];
    b.position.y = b.userData.originalY + Math.sin(Date.now() * b.userData.speed) * 0.55;
    b.rotation.y += 0.01;
  }

  // Partículas
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.position.add(p.userData.velocity);
    p.userData.velocity.y -= 0.01;
    p.userData.life -= 0.028;
    p.scale.setScalar(Math.max(p.userData.life, 0.01));
    p.material.opacity = p.userData.life;

    if (p.userData.life <= 0) {
      scene.remove(p);
      particles.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}

animate();

document.getElementById('highscore').textContent = highScore;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});