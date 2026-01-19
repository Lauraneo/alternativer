import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

// -------------------------------------
// SCENE
// -------------------------------------
const scene = new THREE.Scene();

// -------------------------------------
// CAMERA
// -------------------------------------
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(-20, 30, 100);

// -------------------------------------
// RENDERER
// -------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;
document.body.appendChild(renderer.domElement);

// -------------------------------------
// HDRI
// -------------------------------------
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new HDRLoader().load("/hdri/shanghai_bund_4k.hdr", (texture) => {
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  scene.environment = envMap;
  scene.background = envMap;
  texture.dispose();
  pmremGenerator.dispose();
});

// -------------------------------------
// LIGHTS
// -------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 3);
dirLight.position.set(5, 5, 10);
scene.add(dirLight);

// -------------------------------------
// VIDEO (starter slukket)
// -------------------------------------
const video = document.createElement("video");
video.src = "/videos/projection1.mp4"; // 👈 preload EN video
video.loop = true;
video.muted = true;
video.playsInline = true;
video.autoplay = true;
video.play();

const videoTexture = new THREE.VideoTexture(video);
videoTexture.colorSpace = THREE.SRGBColorSpace;
videoTexture.needsUpdate = true;

const projectionMaterial = new THREE.MeshBasicMaterial({
  map: videoTexture,
  transparent: true,
  opacity: 2,
  depthWrite: false,
  depthTest: true,
  blending: THREE.MultiplyBlending,
  premultipliedAlpha: true,
  side: THREE.FrontSide,
});

// -------------------------------------
// LOAD MODEL
// -------------------------------------
const gltfLoader = new GLTFLoader();
let overlays = [];
let projectionActive = false;
let activeVideo = null;

gltfLoader.load("/models/vintage_radio_(GLTF)/raadhuset4real.gltf", (gltf) => {
  const model = gltf.scene;

  model.scale.set(5, 5, 5);
  model.rotation.set(0, -Math.PI / 2, 0);
  model.position.set(0, 0, -100);

  scene.add(model);
  camera.lookAt(0, 5, -100);

  // 👇 OVERLAY LÆGGES OVENPÅ – MEN SKJULT
  model.traverse((child) => {
    if (!child.isMesh) return;

    const name = child.material?.name;
    if (
      name === "Old Brick" ||
      name === "Medieval Stone Roof" ||
      name === "Rococo Bronze" ||
      name === "Wood" ||
      name === "Material.008"
    ) {
      const overlay = new THREE.Mesh(child.geometry, projectionMaterial);
      overlay.visible = false;
      overlay.renderOrder = 1;
      child.add(overlay);
      overlays.push(overlay);
    }
  });
});

// -------------------------------------
// STARTSKÆRM
// -------------------------------------
const startScreen = document.getElementById("start-screen");
const startBtn = document.getElementById("start-btn");
const controls = document.getElementById("controls");

startBtn.addEventListener("click", () => {
  startScreen.style.display = "none";
  controls.style.display = "flex";
});

// -------------------------------------
// VIDEO-KNAPPPER
// -------------------------------------
document.querySelectorAll("#controls button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const file = btn.dataset.video;

    // 👇 Hvis samme video klikkes igen → SLUK
    if (projectionActive && activeVideo === file) {
      video.pause();
      video.currentTime = 0;

      overlays.forEach((o) => (o.visible = false));

      projectionActive = false;
      activeVideo = null;
      return;
    }

    // 👇 Ellers → SKIFT / TÆND video
    video.pause();
    video.src = `/videos/${file}`;
    video.load();
    video.play();

    overlays.forEach((o) => (o.visible = true));

    projectionActive = true;
    activeVideo = file;
  });
});

// -------------------------------------
// RESIZE
// -------------------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -------------------------------------
// ANIMATE
// -------------------------------------
function animate() {
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
