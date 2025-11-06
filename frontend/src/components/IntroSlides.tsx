// frontend/src/components/IntroSlides.tsx
import { useState, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, PerspectiveCamera, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import './IntroSlides.css';

interface IntroSlidesProps {
  onComplete: () => void;
}

// Câmera cinemática que viaja entre orbs com motion blur effect
function TravelingCamera({ targetIndex }: { targetIndex: number }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const velocityRef = useRef(0);
  
  // Posições dos orbs (planetas) bem distantes
  const orbPositions = [
    [0, 0, 0],
    [25, 5, -15],
    [-20, -8, -35],
    [15, 10, -55],
    [-25, -5, -75],
    [20, 8, -95],
  ];
  
  useFrame((state, delta) => {
    if (!cameraRef.current) return;
    
    const target = orbPositions[targetIndex];
    const current = cameraRef.current.position;
    
    // Distância para o alvo
    const distance = Math.sqrt(
      Math.pow(target[0] - current.x, 2) +
      Math.pow(target[1] - current.y, 2) +
      Math.pow(target[2] - current.z, 2)
    );
    
    // Velocidade proporcional à distância (acelera e desacelera suavemente)
    const speed = Math.min(distance * 0.5, 8);
    velocityRef.current = speed;
    
    // Direção normalizada
    const dir = new THREE.Vector3(
      target[0] - current.x,
      target[1] - current.y,
      target[2] - current.z
    ).normalize();
    
    // Movimento suave com easing
    const easing = 1 - Math.pow(1 - Math.min(delta * 2, 1), 3);
    current.x += dir.x * speed * delta * easing;
    current.y += dir.y * speed * delta * easing;
    current.z += dir.z * speed * delta * easing;
    
    // Adicionar oscilação leve durante viagem
    if (distance > 3) {
      current.x += Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
      current.y += Math.cos(state.clock.elapsedTime * 1.2) * 0.03;
    }
    
    // Olhar para o próximo orb
    cameraRef.current.lookAt(target[0], target[1], target[2]);
    
    // Motion blur effect suavizado (fov aumenta com velocidade)
    const targetFov = 70 + velocityRef.current * 0.8;
    cameraRef.current.fov += (targetFov - cameraRef.current.fov) * 0.1;
    cameraRef.current.updateProjectionMatrix();
  });
  
  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 5]} fov={70} />;
}

// Componente 3D animado para cada slide - MAIS SUAVE e menor
function AnimatedSphere({ color }: { color: string }) {
  const sphereRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (sphereRef.current) {
      // Rotação suave
      sphereRef.current.rotation.y = t * 0.15;
      sphereRef.current.rotation.x = Math.sin(t * 0.1) * 0.08;
      
      // Pulsação muito sutil
      const pulse = 1 + Math.sin(t * 0.8) * 0.03;
      sphereRef.current.scale.set(pulse, pulse, pulse);
    }
  });
  
  return (
    <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.8}>
      <group>
        <Sphere ref={sphereRef} args={[1.5, 64, 64]}>
          <MeshDistortMaterial
            color={color}
            attach="material"
            distort={0.25}
            speed={1.2}
            roughness={0.2}
            metalness={0.8}
            emissive={color}
            emissiveIntensity={0.3}
          />
        </Sphere>
        <Sparkles count={20} scale={3} size={1.5} speed={0.15} color={color} />
      </group>
    </Float>
  );
}

// Componente 3D de partículas - REDUZIDO e otimizado
function Particles() {
  const particles = Array.from({ length: 20 }, () => ({
    position: [
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
    ] as [number, number, number],
    scale: Math.random() * 0.06 + 0.03,
  }));

  return (
    <>
      {particles.map((particle, i) => (
        <Float key={i} speed={0.8 + Math.random() * 0.5} rotationIntensity={0.3}>
          <Sphere args={[particle.scale, 6, 6]} position={particle.position}>
            <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.3} />
          </Sphere>
        </Float>
      ))}
    </>
  );
}

export default function IntroSlides({ onComplete }: IntroSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "HARP-I.A",
      subtitle: "Plataforma Amazônida de Análise Climática",
      description: "HARP-I.A é a plataforma Amazônida, nascida em Belém que transforma dados de satélite e inteligência artificial em informação útil, acessível e em tempo real. Empoderamos comunidades vulneráveis, pesquisadores e gestores a decidir com base em evidências, conscientizando, reduzindo riscos e protegendo vidas nas cidades mais afetadas pela crise climática.",
      color: "#00e5ff",
      icon: "🦅"
    },
    {
      title: "Baixadas: as vizinhanças mais afetadas pelas mudanças climáticas",
      subtitle: "As Vizinhanças Mais Afetadas",
      description: "Nas áreas mais baixas da Amazônia, inundações, ilhas de calor e risco geohidrológicos já são realidade. Quem vive nessas periferias é quem mais sente os impactos, mas quem menos acessa informações capazes de antecipar e reduzir danos. A injustiça climática e o racismo ambiental tem CEP. E é nas baixadas.",
      color: "#00ff88",
      icon: "🏘️"
    },
    {
      title: "Conexão entre dados e quem precisa",
      subtitle: "Pontes sobre o abismo de informação",
      description: "Satélites da NASA e dados do IBGE já monitoram:\n\n• Inundações\n• Temperatura da superfície\n• Vegetação e ocupação do solo\n• Vulnerabilidade social\n\nFalta de ferramentas e abismo de informação?\nNós buscamos construir pontes.",
      color: "#ff6b9d",
      icon: "🛰️"
    },
    {
      title: "JATAÍ: Copiloto Ambiental Paraense",
      subtitle: "A informação que era distante, agora fala a nossa língua",
      description: "JATAÍ: copiloto ambiental com linguagem natural e sotaque da Amazônia.\n\nVocê pergunta.\nA IA busca, interpreta e responde usando os dados da plataforma.\n\n> \"Ei maninho... e a enchente aí no meu bairro?\"\n> \"Tá um mormaço... isso é ilha de calor?\"\n> \"Égua, é sim! A camada que tu selecionou revela uma alta temperatura e baixa arborização na tua área...\"",
      color: "#ffd700",
      icon: "🐝"
    },
    {
      title: "Nomeados Globais de Belém!",
      subtitle: "Avançamos à etapa global",
      description: "Avançamos à etapa global!\n\n• Justiça ambiental\n• Dados abertos\n• IA para adaptação climática\n\nSomos Amazônia competindo no cenário mundial.",
      color: "#9d4edd",
      icon: "🌍"
    },
    {
      title: "O Que Já Entregamos",
      subtitle: "Resultados Concretos",
      description: "Monitoramento em tempo real de alagamentos e ilhas de calor. Visualização 2D/3D de elevação e vegetação. Sistema de alertas pra eventos extremos. Plataforma de ciência cidadã pra relatos locais.",
      color: "#06ffa5",
      icon: "📊"
    },
    {
      title: "Futuro",
      subtitle: "Expansão e Inovação",
      description: "Expansão pra outras cidades amazônicas (Manaus, Macapá, Santarém). Integração com novos satélites e sensores IoT locais. Parcerias com universidades e governos. Objetivo: cidades resilientes e justas.",
      color: "#ff9e00",
      icon: "🚀"
    },
    {
      title: "Teste Nossa Versão Beta",
      subtitle: "Seja Parte da Mudança",
      description: "A HARP-IA tá em fase beta aberta. Desenha polígonos no mapa, conversa com o JATAÍ, explora as baixadas em 3D. Teus feedbacks moldam o futuro da plataforma. Vamos juntos?",
      color: "#ff006e",
      icon: "🎯"
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="intro-slides-container">
      {/* Background 3D Canvas com transição de câmera */}
      <div className="slides-3d-background">
        <Suspense fallback={null}>
          <Canvas>
            <TravelingCamera targetIndex={currentSlide} />
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={1.5} color={slides[currentSlide].color} />
            <pointLight position={[-10, -10, -10]} intensity={0.8} color="#ffffff" />
            
            {/* Render todos os orbs em suas posições */}
            {slides.map((slide, i) => {
              const positions = [
                [0, 0, 0],
                [25, 5, -15],
                [-20, -8, -35],
                [15, 10, -55],
                [-25, -5, -75],
                [20, 8, -95],
              ];
              return (
                <group key={i} position={positions[i] as [number, number, number]}>
                  <AnimatedSphere color={slide.color} />
                </group>
              );
            })}
            
            <Particles />
          </Canvas>
        </Suspense>
      </div>

      {/* Vignette cinematográfico */}
      <div className="cinematic-vignette" />

      {/* Slides Content */}
      <div className="slides-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="slide"
            initial={{ opacity: 0, x: 300, rotateY: 90, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, x: -300, rotateY: -90, scale: 0.8 }}
            transition={{ 
              duration: 1.2, 
              type: "spring", 
              damping: 20,
              staggerChildren: 0.1
            }}
          >
            <motion.div
              className="slide-icon"
              initial={{ scale: 0, rotate: -360 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                delay: 0.3, 
                duration: 1, 
                type: "spring",
                damping: 12
              }}
            >
              {slides[currentSlide].icon}
            </motion.div>

            <motion.h1
              className="slide-title"
              initial={{ opacity: 0, y: 100, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                delay: 0.5, 
                duration: 0.8,
                type: "spring",
                damping: 15
              }}
            >
              {slides[currentSlide].title}
            </motion.h1>

            <motion.h2
              className="slide-subtitle"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              {slides[currentSlide].subtitle}
            </motion.h2>

            <motion.p
              className="slide-description"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
            >
              {slides[currentSlide].description}
            </motion.p>

            {/* Linha decorativa cinematográfica */}
            <motion.div
              className="slide-divider"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '100%', opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.8 }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="slides-navigation">
          <div className="slides-dots">
            {slides.map((_, index) => (
              <motion.button
                key={index}
                className={`slide-dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Ir para slide ${index + 1}`}
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.9 }}
                animate={{
                  backgroundColor: index === currentSlide ? slides[currentSlide].color : 'transparent',
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>

          <div className="slides-buttons">
            {currentSlide > 0 && (
              <motion.button
                className="slide-btn slide-btn-prev"
                onClick={handlePrev}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                whileHover={{ scale: 1.08, x: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                ← Anterior
              </motion.button>
            )}

            <motion.button
              className="slide-btn slide-btn-skip"
              onClick={handleSkip}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Pular Introdução
            </motion.button>

            <motion.button
              className="slide-btn slide-btn-next"
              onClick={handleNext}
              whileHover={{ scale: 1.08, x: 5 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: `linear-gradient(135deg, ${slides[currentSlide].color} 0%, ${slides[(currentSlide + 1) % slides.length].color} 100%)`
              }}
            >
              {currentSlide === slides.length - 1 ? 'Começar →' : 'Próximo →'}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Scanlines cinematográficos */}
      <div className="scanlines" />
    </div>
  );
}
