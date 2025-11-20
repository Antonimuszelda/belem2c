// frontend/src/components/Loading3D.tsx
import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  Sphere, 
  Ring, 
  Float, 
  Html,
  Stars,
  PerspectiveCamera,
  Sparkles
} from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import './Loading3D.css';

interface Loading3DProps {
  message?: string;
}

// Câmera cinematográfica com movimento orbital melhorado
function CinematicCamera() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (cameraRef.current) {
      // Movimento orbital suave com variação de altura
      const radius = 12 + Math.sin(t * 0.15) * 2; // Raio varia entre 10 e 14
      cameraRef.current.position.x = Math.sin(t * 0.2) * radius;
      cameraRef.current.position.y = Math.cos(t * 0.12) * 3 + 1; // Movimento vertical mais pronunciado
      cameraRef.current.position.z = Math.cos(t * 0.2) * radius;
      cameraRef.current.lookAt(0, 0, 0);
      
      // Breathing effect com FOV - zoom in/out suave
      cameraRef.current.fov = 70 + Math.sin(t * 0.25) * 5; // Variação mais perceptível
      cameraRef.current.updateProjectionMatrix();
    }
  });
  
  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 12]} fov={70} />;
}

// Harpia 3D cinematográfica com anéis e efeitos
function HarpiaModel() {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Anéis com movimento suave
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = t * 0.2 + Math.sin(t * 0.3) * 0.1;
      ring1Ref.current.rotation.z = Math.sin(t * 0.4) * 0.15;
    }
    
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = t * 0.3;
      ring2Ref.current.rotation.z = Math.cos(t * 0.35) * 0.2;
    }
    
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x = -t * 0.25 + Math.cos(t * 0.2) * 0.1;
      ring3Ref.current.rotation.y = Math.sin(t * 0.6) * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Logo da HARP-IA (harpia) - NORMAL (HTML) */}
      <Html center>
        <div style={{
          width: '350px',
          height: '350px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <img 
            src="/images/harpia-logo.png" 
            alt="Harpia Logo" 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 30px rgba(0, 212, 230, 0.8))'
            }}
          />
        </div>
      </Html>

      {/* Sparkles ao redor */}
      <Sparkles count={80} scale={4} size={2} speed={0.3} color="#00d4e6" />

        {/* Anéis orbitais com materiais brilhantes - MENOS INTENSOS */}
        <Ring ref={ring1Ref} args={[2, 2.15, 64]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial 
            color="#00d4e6" 
            emissive="#00d4e6" 
            emissiveIntensity={0.6}
            metalness={0.8}
            roughness={0.2}
          />
        </Ring>

        <Ring ref={ring2Ref} args={[2.5, 2.65, 64]} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
          <meshStandardMaterial 
            color="#00b8cc" 
            emissive="#00b8cc" 
            emissiveIntensity={0.6}
            metalness={0.8}
            roughness={0.2}
          />
        </Ring>

        <Ring ref={ring3Ref} args={[3, 3.15, 64]} rotation={[0, Math.PI / 3, Math.PI / 6]}>
          <meshStandardMaterial 
            color="#c4d92e" 
            emissive="#c4d92e" 
            emissiveIntensity={0.6}
            metalness={0.8}
            roughness={0.2}
          />
        </Ring>
      </group>
  );
}

// Partículas flutuantes cinematográficas - OTIMIZADO
function FloatingParticles() {
  const particlesRef = useRef<THREE.Group>(null);
  const particleMeshes = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Rotação muito suave do grupo
    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.04;
      particlesRef.current.rotation.x = Math.sin(t * 0.05) * 0.03;
    }
    
    // Animação individual de cada partícula - MAIS SUTIL
    particleMeshes.current.forEach((mesh, i) => {
      if (mesh) {
        const offset = i * 0.1;
        mesh.position.y += Math.sin(t + offset) * 0.001;
        mesh.scale.setScalar(0.8 + Math.sin(t * 1.5 + offset) * 0.15);
      }
    });
  });

  const particles = Array.from({ length: 80 }, (_, i) => { // Reduzido de 150 para 80
    const angle = (i / 80) * Math.PI * 2;
    const radius = 6 + Math.random() * 4;
    const height = (Math.random() - 0.5) * 10;
    
    return {
      position: [
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius,
      ] as [number, number, number],
      scale: Math.random() * 0.06 + 0.02,
      color: ['#00e5ff', '#00ff88', '#ff6b9d', '#ffd700'][Math.floor(Math.random() * 4)],
    };
  });

  return (
    <group ref={particlesRef}>
      {particles.map((particle, i) => (
        <Float key={i} speed={1 + Math.random() * 2} rotationIntensity={0.5}>
          <Sphere 
            args={[particle.scale, 12, 12]} 
            position={particle.position}
            ref={(el) => {
              if (el) particleMeshes.current[i] = el;
            }}
          >
            <meshStandardMaterial 
              color={particle.color} 
              emissive={particle.color}
              emissiveIntensity={1.2}
              metalness={0.8}
              roughness={0.2}
            />
          </Sphere>
        </Float>
      ))}
    </group>
  );
}

// Texto de loading animado
function LoadingText({ message }: { message: string }) {
  return (
    <Html center>
      <motion.div
        className="loading-3d-text"
        initial={{ opacity: 0, scale: 0.5, y: -50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1, type: "spring", damping: 10 }}
      >
        <motion.h2
          animate={{
            textShadow: [
              '0 0 20px rgba(0, 229, 255, 0.5)',
              '0 0 60px rgba(0, 229, 255, 1)',
              '0 0 20px rgba(0, 229, 255, 0.5)',
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {message}
        </motion.h2>
      </motion.div>
    </Html>
  );
}

export default function Loading3D({ message = "Carregando..." }: Loading3DProps) {
  return (
    <div className="loading-3d-container">
      <Suspense fallback={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          color: '#00e5ff',
          fontSize: '2rem'
        }}>
          Carregando 3D...
        </div>
      }>
        <Canvas>
          {/* Câmera cinematográfica */}
          <CinematicCamera />
          
          {/* Iluminação cinematográfica - MAIS SUAVE */}
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={1.2} color="#00e5ff" />
          <pointLight position={[-10, -10, -10]} intensity={0.8} color="#ff6b9d" />
          <pointLight position={[0, 15, 0]} intensity={0.7} color="#00ff88" />
          <spotLight 
            position={[0, 10, 0]} 
            angle={0.3} 
            penumbra={0.5} 
            intensity={1.2}
            color="#ffd700"
          />

          {/* Estrelas de fundo com movimento - OTIMIZADO */}
          <Stars radius={120} depth={60} count={4000} factor={4} saturation={0.4} fade speed={1} />

          {/* Modelo 3D */}
          <HarpiaModel />

          {/* Partículas */}
          <FloatingParticles />

          {/* Texto */}
          <LoadingText message={message} />
        </Canvas>
      </Suspense>

      {/* Barra de progresso cinematográfica */}
      <div className="loading-3d-progress">
        <motion.div
          className="loading-3d-progress-bar"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        />
        <motion.div
          className="loading-3d-progress-glow"
          initial={{ left: '0%' }}
          animate={{ left: '100%' }}
          transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
        />
      </div>
      
      {/* Efeito de lens flare */}
      <motion.div
        className="lens-flare"
        animate={{
          opacity: [0.1, 0.3, 0.1],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
