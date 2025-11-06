// frontend/src/components/HyperspaceTransition.tsx
import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import './HyperspaceTransition.css';

// Estrela individual do hiperespaço - COM CORES
function HyperspaceStar({ position, speed, color }: { position: [number, number, number]; speed: number; color: string }) {
  const starRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (starRef.current) {
      // Movimento para trás (hiperespaço)
      starRef.current.position.z += speed;
      
      // Reset quando passar da câmera
      if (starRef.current.position.z > 5) {
        starRef.current.position.z = -80;
      }
      
      // Efeito de esticamento (motion blur) mais sutil
      const stretchFactor = Math.min(speed * 8, 4); // Reduzido
      starRef.current.scale.set(0.08, 0.08, stretchFactor);
    }
  });
  
  return (
    <mesh ref={starRef} position={position}>
      <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
}

// Campo de estrelas do hiperespaço - COM CORES VARIADAS
function HyperspaceField() {
  const starColors = ['#00e5ff', '#0088ff', '#9d4edd', '#ff006e', '#06ffa5', '#ffd700', '#ffffff'];
  
  const stars = Array.from({ length: 400 }, () => ({ // Reduzido de 1000 para 400
    position: [
      (Math.random() - 0.5) * 60, // Área menor
      (Math.random() - 0.5) * 60,
      -Math.random() * 80,
    ] as [number, number, number],
    speed: 0.3 + Math.random() * 1.0, // Velocidade mais moderada
    color: starColors[Math.floor(Math.random() * starColors.length)]
  }));
  
  return (
    <>
      {stars.map((star, i) => (
        <HyperspaceStar key={i} position={star.position} speed={star.speed} color={star.color} />
      ))}
    </>
  );
}

// Efeito de energia carregando (como nave espacial)
function EnergyCharge() {
  const particlesRef = useRef<THREE.Points>(null);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (particlesRef.current) {
      // Expansão das partículas como se estivesse carregando energia
      const scale = 1 + Math.min(t * 0.8, 2);
      particlesRef.current.scale.set(scale, scale, scale);
      
      // Rotação para dar dinamismo
      particlesRef.current.rotation.z = t * 0.5;
      
      // Fade out gradual
      const material = particlesRef.current.material as THREE.PointsMaterial;
      material.opacity = Math.max(0, 0.8 - t * 0.3);
    }
  });
  
  // Criar geometria de partículas em espiral (como energia se acumulando)
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 8; // Espiral
    const radius = (i / particleCount) * 3;
    
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    
    // Cores gradientes (cyan -> magenta -> amarelo)
    const colorPhase = i / particleCount;
    colors[i * 3] = colorPhase; // R
    colors[i * 3 + 1] = 1 - colorPhase * 0.5; // G
    colors[i * 3 + 2] = 1; // B
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  return (
    <points ref={particlesRef}>
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Câmera com shake de hiperespaço - SUAVIZADO
function HyperspaceCamera() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (cameraRef.current) {
      // Shake muito sutil
      const shake = Math.min(t * 0.2, 0.5);
      cameraRef.current.position.x = Math.sin(t * 3) * shake * 0.05;
      cameraRef.current.position.y = Math.cos(t * 2.5) * shake * 0.05;
      cameraRef.current.rotation.z = Math.sin(t * 4) * shake * 0.01;
      
      // FOV aumentando suavemente (menos extremo)
      cameraRef.current.fov = 75 + Math.min(t * 12, 35); // Máximo 110 ao invés de 135
      cameraRef.current.updateProjectionMatrix();
    }
  });
  
  useEffect(() => {
    if (cameraRef.current) {
      // Set as default camera
      const camera = cameraRef.current;
      camera.position.set(0, 0, 5);
    }
  }, []);
  
  return <perspectiveCamera ref={cameraRef} position={[0, 0, 5]} fov={75} />;
}

export default function HyperspaceTransition() {
  // Removido o som para melhor performance
  
  return (
    <div className="hyperspace-container">
      <Canvas>
        <HyperspaceCamera />
        <HyperspaceField />
        <EnergyCharge />
        <fog attach="fog" args={['#000000', 1, 100]} />
      </Canvas>
      
      {/* Overlay de velocidade */}
      <motion.div
        className="hyperspace-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0.5, 0] }}
        transition={{ duration: 2.5, times: [0, 0.3, 0.7, 1], ease: "easeInOut" }}
      />
      
      {/* Linhas de velocidade nas bordas */}
      <motion.div
        className="speed-lines"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0.6, 0] }}
        transition={{ duration: 2.5, times: [0, 0.2, 0.8, 1], ease: "easeInOut" }}
      />
      
      {/* Texto "INICIANDO ANÁLISE..." */}
      <motion.div
        className="hyperspace-text"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: [0, 1, 1, 0],
          scale: [0.8, 1, 1.1, 1.3]
        }}
        transition={{ duration: 2.5, times: [0, 0.2, 0.7, 1], ease: "easeOut" }}
      >
        <h1>INICIANDO ANÁLISE...</h1>
      </motion.div>
    </div>
  );
}
