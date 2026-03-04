import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { PhysicsEngine, PhysicsConfig, soundManager } from './physics';

// MUI Components
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline, 
  Box, 
  TextField, 
  IconButton, 
  Tooltip, 
  Typography,
  Paper,
  Stack,
  Slider,
  Drawer,
  Modal,
  Menu,
  MenuItem,
  styled,
  useMediaQuery,
  InputAdornment,
  Button
} from '@mui/material';

// Icons
import {
  HelpOutline as HelpIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Tune as TuneIcon,
  Close as CloseIcon,
  Keyboard as KeyboardIcon,
  Mouse as MouseIcon,
  AutoFixHigh as MagnetIcon,
  Palette as PaletteIcon,
  ScreenRotation as GyroIcon,
  Apps as AppsIcon,
  VolumeUp as VolOnIcon,
  VolumeOff as VolOffIcon,
  RestartAlt as ResetIcon,
  FontDownload as FontIcon
} from '@mui/icons-material';

// --- Constants ---

const DEFAULT_CONFIG: PhysicsConfig = {
  gravityX: 0,
  gravityY: 1,
  restitution: 0.6,
  friction: 0.1,
  airResistance: 0.01
};

type ThemeType = 'classic' | 'berry' | 'soda' | 'lime' | 'grape';
type FontType = 'Titan One' | 'Bungee' | 'Chewy';

const THEMES: Record<ThemeType, { name: string, mainColor: string, preview: string, blobColors: string[] }> = {
  classic: { 
    name: 'Jelly Mix', mainColor: '#FF6B6B', preview: '#FF9A9E',
    blobColors: ['#FF9A9E', '#A18CD1', '#FBC2EB', '#84FAB0', '#8FD3F4']
  },
  berry: { 
    name: 'Strawberry Pop', mainColor: '#FF0055', preview: '#FF0055',
    blobColors: ['#FF0055', '#FF5588', '#FFBBDD', '#FF88AA', '#CC0044']
  },
  soda: { 
    name: 'Soda Pop', mainColor: '#00AAFF', preview: '#00AAFF',
    blobColors: ['#00AAFF', '#55CCFF', '#AAEEFF', '#0088CC', '#88DDFF']
  },
  lime: { 
    name: 'Lemon Lime', mainColor: '#AACC00', preview: '#AACC00',
    blobColors: ['#AACC00', '#DDEE00', '#EEFF88', '#88AA00', '#CCFF00']
  },
  grape: { 
    name: 'Grape Punch', mainColor: '#9900FF', preview: '#9900FF',
    blobColors: ['#9900FF', '#BB66FF', '#DDBBFF', '#7700CC', '#AA88FF']
  }
};

const FONTS: Record<FontType, string> = {
  'Titan One': "'Titan One'",
  'Bungee': "'Bungee'",
  'Chewy': "'Chewy'"
};

// --- Styled Components ---

const GlassPaper = styled(Paper)(() => ({
  background: 'rgba(255, 255, 255, 0.12)',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.05)',
  borderRadius: '24px',
  color: '#444', 
}));

const GlassInput = styled(TextField, {
  shouldForwardProp: (prop) => prop !== 'themeColor' && prop !== 'activeFont',
})<{ themeColor: string; activeFont: string }>(({ themeColor, activeFont }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(50px)',
    WebkitBackdropFilter: 'blur(50px)',
    borderRadius: '50px',
    color: '#333', 
    fontWeight: 'bold',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    padding: '0 8px 0 24px',
    fontFamily: activeFont, 
    '& fieldset': { border: '1px solid rgba(255, 255, 255, 0.15)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
    '&.Mui-focused': {
      transform: 'scale(1.02)',
      '& fieldset': { borderColor: themeColor, opacity: 0.5 }, 
    },
  },
  '& .MuiInputBase-input': { 
    textAlign: 'center', 
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontFamily: 'inherit',
  },
  '& .MuiInputBase-input::placeholder': { color: 'rgba(128, 128, 128, 0.4)', opacity: 1, fontFamily: "'Titan One', sans-serif" },
}));

const SettingRow = ({ label, value, min, max, step, onChange }: any) => (
  <Box sx={{ mb: 3 }}>
    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
      <Typography variant="caption" sx={{ color: '#666', fontWeight: 600 }}>{label}</Typography>
      <Typography variant="caption" sx={{ color: '#333', fontWeight: 700 }}>{value}</Typography>
    </Stack>
    <Slider 
      value={value} min={min} max={max} step={step} 
      onChange={(_, v) => onChange(v)}
      sx={{ color: '#666', '& .MuiSlider-thumb': { width: 12, height: 12 }, '& .MuiSlider-rail': { opacity: 0.2, backgroundColor: '#000' } }}
    />
  </Box>
);

const ShortcutKey = ({ children }: { children: React.ReactNode }) => (
  <Box component="span" sx={{ 
    px: 0.8, py: 0.2, bgcolor: '#eee', borderRadius: '4px', border: '1px solid #ccc', 
    fontSize: '0.65rem', fontWeight: 900, fontFamily: 'monospace', color: '#555', mx: 0.2 
  }}>
    {children}
  </Box>
);

const ShortcutRow = ({ keys, desc }: { keys: string[], desc: string }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          <ShortcutKey>{k}</ShortcutKey>
          {i < keys.length - 1 && <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 900 }}>+</Typography>}
        </React.Fragment>
      ))}
    </Box>
    <Typography variant="caption" sx={{ color: '#666', fontWeight: 600 }}>{desc}</Typography>
  </Stack>
);

const JellyLogo = ({ isMobile }: { isMobile: boolean }) => {
  const letters = Array.from("JellyType");
  const randomColors = useMemo(() => letters.map(() => `hsl(${Math.floor(Math.random() * 360)}, 85%, 65%)`), []);

  return (
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      style={{
        position: 'absolute',
        top: isMobile ? 16 : 20,
        left: isMobile ? 16 : 24,
        pointerEvents: 'auto',
        zIndex: 100
      }}
    >
      <Typography
        sx={{
          fontSize: isMobile ? '1.2rem' : '1.6rem',
          fontWeight: 900,
          fontFamily: "'Titan One', sans-serif",
          display: 'flex',
          alignItems: 'center',
          cursor: 'default',
          userSelect: 'none',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
        }}
      >
        {letters.map((char, i) => (
          <motion.span
            key={i}
            style={{ 
              display: 'inline-block',
              background: `linear-gradient(180deg, #fff 0%, ${randomColors[i]} 45%, ${randomColors[i]} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
            whileHover={{ 
              scale: 1.3, 
              y: -8, 
              rotate: i % 2 === 0 ? 10 : -10,
              filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.15))'
            }}
            transition={{ type: "spring", stiffness: 400, damping: 8 }}
          >
            {char}
          </motion.span>
        ))}
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            y: [0, -2, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            width: isMobile ? 8 : 10,
            height: isMobile ? 8 : 10,
            backgroundColor: randomColors[randomColors.length - 1],
            borderRadius: '50%',
            marginLeft: 4,
            marginTop: isMobile ? 6 : 8,
            boxShadow: `inset -2px -2px 4px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)`,
            border: '1px solid rgba(255,255,255,0.3)'
          }}
        />
      </Typography>
    </motion.div>
  );
};

const SmartBackgroundBlob = ({ color, size, top, left, duration, mouseX, mouseY }: any) => {
  const x = useSpring(0, { stiffness: 50, damping: 30 });
  const y = useSpring(0, { stiffness: 50, damping: 30 });

  useEffect(() => {
    const centerX = window.innerWidth * (parseFloat(left) / 100);
    const centerY = window.innerHeight * (parseFloat(top) / 100);
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 400) {
      const strength = (1 - distance / 400) * 50;
      x.set(-dx / distance * strength);
      y.set(-dy / distance * strength);
    } else {
      x.set(0); y.set(0);
    }
  }, [mouseX, mouseY, left, top, x, y]);

  return (
    <motion.div
      className="bg-blob"
      style={{ 
        position: 'absolute', width: size, height: size, top: top, left: left, 
        backgroundColor: color, filter: 'blur(100px)', borderRadius: '50%', 
        opacity: 0.4, zIndex: 0, x, y 
      }}
      animate={{ scale: [1, 1.1, 0.9, 1], rotate: [0, 90, 180, 270, 360] }}
      transition={{ duration: duration, repeat: Infinity, ease: "linear" }}
    />
  );
};

const MotionBox = motion.create(Box);

const App: React.FC = () => {
  const isMobile = useMediaQuery('(max-width:768px)');
  const physicsRef = useRef<PhysicsEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [objectsCount, setObjectsCount] = useState(0);
  const [isMagnetMode, setIsMagnetMode] = useState(false);
  const [isMagnetLocked, setIsMagnetLocked] = useState(false);
  const [isGyroActive, setIsGyroActive] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('jelly-muted') === 'true');
  const [activeTheme, setActiveTheme] = useState<ThemeType>(() => (localStorage.getItem('jelly-theme') as ThemeType) || 'classic');
  const [activeFont, setActiveFont] = useState<FontType>(() => (localStorage.getItem('jelly-font') as FontType) || 'Titan One');
  
  const [inputValue, setInputValue] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [themeAnchor, setThemeAnchor] = useState<null | HTMLElement>(null);
  const [fontAnchor, setFontAnchor] = useState<null | HTMLElement>(null);
  const [appsAnchor, setAppsAnchor] = useState<null | HTMLElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const getThemeColor = () => {
    const themeColors = THEMES[activeTheme].blobColors;
    if (activeTheme === 'classic') {
        return `hsl(${Math.floor(Math.random() * 360)}, 85%, 60%)`;
    }
    return themeColors[Math.floor(Math.random() * themeColors.length)];
  };

  const blobs = useMemo(() => {
    const themeColors = THEMES[activeTheme].blobColors;
    return Array.from({ length: 6 }).map((_, i) => ({
      id: i, color: themeColors[i % themeColors.length],
      size: `${Math.random() * 20 + 30}vw`, top: `${Math.random() * 80}%`,
      left: `${Math.random() * 80}%`, duration: Math.random() * 15 + 20
    }));
  }, [activeTheme]);

  const [config, setConfig] = useState<PhysicsConfig>(() => {
    const saved = localStorage.getItem('jelly-config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const theme = useMemo(() => createTheme({
    palette: { mode: 'light', primary: { main: THEMES[activeTheme].mainColor } },
    typography: { fontFamily: "'Titan One', sans-serif" },
  }), [activeTheme]);

  useEffect(() => {
    if (containerRef.current && !physicsRef.current) {
      physicsRef.current = new PhysicsEngine(containerRef.current);
      physicsRef.current.updateConfig(config);
      physicsRef.current.currentFont = FONTS[activeFont];
    }
    const interval = setInterval(() => {
      if (physicsRef.current) setObjectsCount(physicsRef.current.textBodies.length);
    }, 200);
    return () => {
      clearInterval(interval);
      if (physicsRef.current) { physicsRef.current.destroy(); physicsRef.current = null; }
    };
  }, []);

  useEffect(() => {
    soundManager.muted = isMuted;
    localStorage.setItem('jelly-muted', String(isMuted));
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('jelly-theme', activeTheme);
    // 기존 젤리들도 테마 색상으로 업데이트
    if (physicsRef.current) {
      physicsRef.current.applyThemeToAll(getThemeColor);
    }
  }, [activeTheme]);

  useEffect(() => {
    localStorage.setItem('jelly-font', activeFont);
    if (physicsRef.current) physicsRef.current.currentFont = FONTS[activeFont];
  }, [activeFont]);

  useEffect(() => {
    localStorage.setItem('jelly-config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!isGyroActive || !physicsRef.current) return;
      const x = (e.gamma || 0) / 45; const y = (e.beta || 0) / 45;
      physicsRef.current.updateGravity(Math.max(-2, Math.min(2, x)), Math.max(-2, Math.min(2, y)));
    };
    if (isGyroActive) window.addEventListener('deviceorientation', handleOrientation);
    else {
      window.removeEventListener('deviceorientation', handleOrientation);
      if (physicsRef.current) physicsRef.current.updateGravity(config.gravityX, config.gravityY);
    }
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isGyroActive, config]);

  const handleInteraction = (e: any) => {
    if (!isMuted) soundManager.init();
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // 기본 우클릭 메뉴 방지
    toggleMagnet();
  };

  const toggleMute = () => setIsMuted(prev => !prev);

  const toggleGyro = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') setIsGyroActive(!isGyroActive);
      } catch (err) {}
    } else setIsGyroActive(!isGyroActive);
  };

  const handleConfigChange = (key: keyof PhysicsConfig, val: number) => {
    const newConfig = { ...config, [key]: val };
    setConfig(newConfig);
    physicsRef.current?.updateConfig({ [key]: val });
  };

  const resetSettings = () => {
    setConfig(DEFAULT_CONFIG);
    physicsRef.current?.updateConfig(DEFAULT_CONFIG);
    physicsRef.current?.updateGravity(DEFAULT_CONFIG.gravityX, DEFAULT_CONFIG.gravityY);
  };

  const toggleMagnet = () => {
    const newState = !isMagnetMode;
    setIsMagnetMode(newState);
    setIsMagnetLocked(false);
    if (physicsRef.current) {
      physicsRef.current.magnetMode = newState;
      physicsRef.current.lockedMagnetPosition = null;
    }
  };

  const toggleMagnetLock = () => {
    if (!isMagnetMode) return;
    const newState = !isMagnetLocked;
    setIsMagnetLocked(newState);
    if (physicsRef.current) {
      physicsRef.current.lockedMagnetPosition = newState ? { x: mousePos.x, y: mousePos.y } : null;
    }
  };

  const exportPng = () => {
    if (!physicsRef.current) return;
    const physicsCanvas = physicsRef.current.render.canvas;
    const width = physicsCanvas.width;
    const height = physicsCanvas.height;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = width; exportCanvas.height = height;
    const ctx = exportCanvas.getContext("2d")!;
    ctx.fillStyle = "#fcfcfc"; ctx.fillRect(0, 0, width, height);
    blobs.forEach(blob => {
      const sizePx = (parseFloat(blob.size) / 100) * Math.min(width, height);
      const x = (parseFloat(blob.left) / 100) * width;
      const y = (parseFloat(blob.top) / 100) * height;
      ctx.save(); ctx.filter = 'blur(60px)'; ctx.globalAlpha = 0.4; ctx.fillStyle = blob.color;
      ctx.beginPath(); ctx.arc(x, y, sizePx / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });
    ctx.drawImage(physicsCanvas, 0, 0);
    const link = document.createElement("a");
    link.download = `jellytype_${Date.now()}.png`;
    link.href = exportCanvas.toDataURL("image/png"); link.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isMod = e.ctrlKey || e.metaKey;

    // Shortcuts
    if (isMod && e.key === "s") {
      e.preventDefault();
      exportPng();
      return;
    }
    if (isMod && e.key === "m") {
      e.preventDefault();
      toggleMagnet();
      return;
    }
    if (isMod && e.shiftKey && e.key === "L") {
      e.preventDefault();
      toggleMagnetLock();
      return;
    }
    if (isMod && e.key === "Backspace") {
      e.preventDefault();
      physicsRef.current?.clearAll();
      setInputValue("");
      return;
    }

    if (e.key === "Backspace") {
      if (inputValue === "") physicsRef.current?.removeLastWithExplosion();
      else setInputValue(prev => prev.slice(0, -1));
      e.preventDefault();
    } else if (e.key === "Enter") {
      const word = inputValue.trim().toUpperCase();
      if (word === "RAIN" && physicsRef.current) { physicsRef.current.triggerRain(getThemeColor); setInputValue(""); }
      else if (word === "BOMB" && physicsRef.current) { physicsRef.current.triggerBomb(); setInputValue(""); }
      else if (word === "LOVE" && physicsRef.current) { physicsRef.current.triggerLove(); setInputValue(""); }
      else if (inputValue.trim() !== "") {
        Array.from(inputValue).forEach((char, index) => {
          if (char === " ") return;
          setTimeout(() => {
            if (physicsRef.current) {
              physicsRef.current.createLetter(char, getThemeColor());
            }
          }, index * 50);
        });
        setInputValue("");
      } else { physicsRef.current?.applyGlobalForce(); }
      e.preventDefault();
    } else if (e.code === "Space") { setInputValue(prev => prev + " "); e.preventDefault(); }
    else if (e.code.startsWith("Key")) {
      const baseChar = e.code.slice(3);
      const finalChar = (e.shiftKey !== e.getModifierState("CapsLock")) ? baseChar.toUpperCase() : baseChar.toLowerCase();
      setInputValue(prev => prev + finalChar); e.preventDefault();
    } else if (e.code.startsWith("Digit") || ["Minus", "Equal", "BracketLeft", "BracketRight", "Semicolon", "Quote", "Comma", "Period", "Slash"].includes(e.code)) {
      setInputValue(prev => prev + e.key); e.preventDefault();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const filtered = Array.from(val).filter(char => !/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(char)).join("");
    setInputValue(filtered);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        onMouseDown={handleInteraction}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        onTouchStart={handleInteraction}
        onTouchMove={(e) => setMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onContextMenu={handleContextMenu}
        sx={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#fcfcfc' }}
      >
        {blobs.map(blob => <SmartBackgroundBlob key={blob.id} {...blob} mouseX={mousePos.x} mouseY={mousePos.y} />)}
        <Box ref={containerRef} id="canvas-container" sx={{ position: 'absolute', inset: 0, zIndex: 2, '& canvas': { display: 'block', width: '100%', height: '100%' } }} />

        <Box sx={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
          <JellyLogo isMobile={isMobile} />
          {!isMobile && (
            <MotionBox sx={{ position: 'absolute', top: 24, right: 24, color: '#888', fontSize: '0.7rem', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.6)', px: 1.5, py: 0.5, borderRadius: '10px', backdropFilter: 'blur(10px)', fontFamily: "'Titan One', sans-serif" }}>Objects: {objectsCount}</MotionBox>
          )}

          <Box sx={{ position: 'absolute', top: 20, left: isMobile ? 'auto' : '50%', right: isMobile ? 20 : 'auto', transform: isMobile ? 'none' : 'translateX(-50%)', pointerEvents: 'auto' }}>
            <GlassPaper sx={{ p: 0.5, px: isMobile ? 0.5 : 1.5 }}>
              <Stack direction="row" spacing={isMobile ? 0.5 : 1} alignItems="center">
                {isMobile ? (
                  <>
                    <IconButton onClick={(e) => setAppsAnchor(e.currentTarget)} size="small" sx={{ color: '#666' }}><AppsIcon /></IconButton>
                    <Menu anchorEl={appsAnchor} open={Boolean(appsAnchor)} onClose={() => setAppsAnchor(null)}>
                      <MenuItem onClick={() => { setShowHelp(true); setAppsAnchor(null); }}><HelpIcon sx={{ mr: 1.5, fontSize: 20 }}/> How to use</MenuItem>
                      <MenuItem onClick={(e) => { setFontAnchor(e.currentTarget); setAppsAnchor(null); }}><FontIcon sx={{ mr: 1.5, fontSize: 20 }}/> Fonts</MenuItem>
                      <MenuItem onClick={() => { toggleMute(); setAppsAnchor(null); }}>
                        {isMuted ? <VolOffIcon sx={{ mr: 1.5, fontSize: 20 }}/> : <VolOnIcon sx={{ mr: 1.5, fontSize: 20 }}/>} {isMuted ? "Unmute" : "Mute"}
                      </MenuItem>
                      <MenuItem onClick={() => { exportPng(); setAppsAnchor(null); }}><DownloadIcon sx={{ mr: 1.5, fontSize: 20 }}/> Save PNG</MenuItem>
                      <MenuItem onClick={() => { setShowSettings(true); setAppsAnchor(null); }}><TuneIcon sx={{ mr: 1.5, fontSize: 20 }}/> Settings</MenuItem>
                      <MenuItem onClick={() => { physicsRef.current?.clearAll(); setInputValue(""); setAppsAnchor(null); }}><RefreshIcon sx={{ mr: 1.5, fontSize: 20 }}/> Clear All</MenuItem>
                    </Menu>
                  </>
                ) : (
                  <>
                    <Tooltip title="How to use"><IconButton onClick={() => setShowHelp(true)} size="small" sx={{ color: '#666' }}><HelpIcon /></IconButton></Tooltip>
                    <Tooltip title="Fonts"><IconButton onClick={(e) => setFontAnchor(e.currentTarget)} size="small" sx={{ color: '#666' }}><FontIcon /></IconButton></Tooltip>
                    <Tooltip title={isMuted ? "Unmute" : "Mute"}><IconButton onClick={toggleMute} size="small" sx={{ color: isMuted ? '#f44336' : '#666' }}>{isMuted ? <VolOffIcon /> : <VolOnIcon />}</IconButton></Tooltip>
                    <Tooltip title={isGyroActive ? "Gyro Active" : "Gyro Off"}><IconButton onClick={toggleGyro} size="small" sx={{ color: isGyroActive ? '#000' : '#666', bgcolor: isGyroActive ? 'rgba(0,0,0,0.05)' : 'transparent' }}><GyroIcon /></IconButton></Tooltip>
                    <Tooltip title={isMagnetMode ? (isMagnetLocked ? "Magnet Locked" : "Magnet Active") : "Magnet Off"}>
                      <IconButton 
                        onClick={isMagnetMode ? toggleMagnetLock : toggleMagnet} 
                        onContextMenu={(e) => { e.preventDefault(); toggleMagnet(); }}
                        size="small" 
                        sx={{ 
                          color: isMagnetMode ? (isMagnetLocked ? '#ff4081' : '#000') : '#666', 
                          bgcolor: isMagnetMode ? 'rgba(0,0,0,0.05)' : 'transparent',
                          border: isMagnetLocked ? '1px solid #ff4081' : 'none'
                        }}
                      >
                        <MagnetIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Save PNG (Ctrl+S)"><IconButton onClick={exportPng} size="small" sx={{ color: '#666' }}><DownloadIcon /></IconButton></Tooltip>
                    <Box sx={{ width: '1px', height: 24, bgcolor: 'rgba(0,0,0,0.1)', mx: 0.5 }} />
                    <Tooltip title="Settings"><IconButton onClick={() => setShowSettings(true)} size="small" sx={{ color: '#666' }}><TuneIcon /></IconButton></Tooltip>
                    <Tooltip title="Clear All (Ctrl+Backspace)"><IconButton onClick={() => { physicsRef.current?.clearAll(); setInputValue(""); }} size="small" sx={{ color: '#666' }}><RefreshIcon /></IconButton></Tooltip>
                  </>
                )}
              </Stack>
            </GlassPaper>
          </Box>

          <Box sx={{ 
            position: 'absolute', 
            top: isMobile ? 80 : 100, 
            left: '50%', 
            transform: 'translateX(-50%)', 
            width: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            px: 2 
          }}>
            <AnimatePresence mode="wait">
              <MotionBox 
                key={activeTheme}
                initial={{ scale: 0.95, opacity: 0.8 }} 
                animate={{ scale: 1, opacity: 1 }} 
                transition={{ duration: 0.3 }}
                sx={{ pointerEvents: 'auto', width: '100%', maxWidth: isMobile ? 300 : 400, textAlign: 'center' }}
              >
                <GlassInput 
                  fullWidth placeholder="Type here..." value={inputValue} 
                  themeColor={THEMES[activeTheme].mainColor} 
                  activeFont={FONTS[activeFont]}
                  onKeyDown={handleKeyDown} onChange={handleInputChange} autoComplete="off" autoFocus 
                  sx={{ '& .MuiInputBase-input': { fontSize: isMobile ? '1.4rem' : '1.8rem', padding: isMobile ? '14px 0' : '16px 0' } }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={(e) => setThemeAnchor(e.currentTarget)} size="small" sx={{ color: THEMES[activeTheme].mainColor, transition: 'all 0.4s ease', mr: 0.5 }}>
                          <PaletteIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                <Typography variant="body2" sx={{ mt: 1.5, color: '#999', fontSize: isMobile ? '0.75rem' : '0.875rem', fontWeight: 600, fontFamily: "'Titan One', sans-serif" }}>
                  Flavor: <span style={{ color: THEMES[activeTheme].mainColor }}>{THEMES[activeTheme].name}</span>
                </Typography>
              </MotionBox>
            </AnimatePresence>
          </Box>
        </Box>

        {/* --- Menus --- */}
        <Menu anchorEl={themeAnchor} open={Boolean(themeAnchor)} onClose={() => setThemeAnchor(null)}>
          {(Object.keys(THEMES) as ThemeType[]).map((t) => (
            <MenuItem key={t} onClick={() => { setActiveTheme(t); setThemeAnchor(null); }} selected={activeTheme === t}>
              <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: THEMES[t].preview, mr: 1.5 }} />
              {THEMES[t].name}
            </MenuItem>
          ))}
        </Menu>

        <Menu anchorEl={fontAnchor} open={Boolean(fontAnchor)} onClose={() => setFontAnchor(null)}>
          {(Object.keys(FONTS) as FontType[]).map((f) => (
            <MenuItem key={f} onClick={() => { setActiveFont(f); setFontAnchor(null); }} selected={activeFont === f} sx={{ fontFamily: FONTS[f] }}>
              {f}
            </MenuItem>
          ))}
        </Menu>

        <Modal open={showHelp} onClose={() => setShowHelp(false)}>
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: isMobile ? 320 : 400, outline: 'none' }}>
            <GlassPaper sx={{ p: 4, background: 'rgba(255,255,255,0.95)', color: '#333' }}>
              <Stack spacing={2.5}>
                <Typography variant="h6" align="center" sx={{ fontWeight: 900, fontFamily: "'Titan One', sans-serif" }}>Shortcuts & Manual</Typography>
                
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: '#FF6B6B' }}>Keyboard</Typography>
                  <Stack spacing={1}>
                    <ShortcutRow keys={["Type anything"]} desc="Create jellies" />
                    <ShortcutRow keys={["Enter"]} desc="Global force / Special words" />
                    <ShortcutRow keys={["Ctrl", "S"]} desc="Save Screenshot" />
                    <ShortcutRow keys={["Ctrl", "M"]} desc="Toggle Magnet" />
                    <ShortcutRow keys={["Ctrl", "Shift", "L"]} desc="Lock Magnet Position" />
                    <ShortcutRow keys={["Ctrl", "BS"]} desc="Clear All" />
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: '#4facfe' }}>Interaction</Typography>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={2}><MouseIcon size="small" /><Typography variant="caption" sx={{ ml: 1 }}>Click & drag to play with jellies.</Typography></Stack>
                    <Stack direction="row" spacing={2}><MouseIcon size="small" /><Typography variant="caption" sx={{ ml: 1 }}><b>Right-click anywhere</b> to toggle Magnet.</Typography></Stack>
                    <Stack direction="row" spacing={2}><MagnetIcon size="small" /><Typography variant="caption" sx={{ ml: 1 }}>Click Magnet icon to Lock position.</Typography></Stack>
                  </Stack>
                </Box>

                <IconButton onClick={() => setShowHelp(false)} sx={{ alignSelf: 'center', mt: 1 }}><CloseIcon /></IconButton>
              </Stack>
            </GlassPaper>
          </Box>
        </Modal>

        <Drawer anchor="right" open={showSettings} onClose={() => setShowSettings(false)} PaperProps={{ sx: { width: isMobile ? '80%' : 300, background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(30px)', p: 3 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}><Typography variant="h6" sx={{ fontFamily: "'Titan One', sans-serif" }}>Settings</Typography><IconButton onClick={() => setShowSettings(false)} size="small"><CloseIcon /></IconButton></Stack>
          <SettingRow label="Gravity" value={config.gravityY} min={-2} max={2} step={0.1} onChange={(v: number) => handleConfigChange('gravityY', v)} />
          <SettingRow label="Bounciness" value={config.restitution} min={0} max={1.2} step={0.05} onChange={(v: number) => handleConfigChange('restitution', v)} />
          <SettingRow label="Friction" value={config.friction} min={0} max={1} step={0.01} onChange={(v: number) => handleConfigChange('friction', v)} />
          <SettingRow label="Air Resistance" value={config.airResistance} min={0} max={0.2} step={0.001} onChange={(v: number) => handleConfigChange('airResistance', v)} />
          <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <Button fullWidth variant="outlined" startIcon={<ResetIcon />} onClick={resetSettings} sx={{ borderRadius: '12px', color: '#666', borderColor: '#ccc', fontFamily: "'Titan One', sans-serif" }}>Reset to Default</Button>
          </Box>
        </Drawer>
      </Box>
    </ThemeProvider>
  );
};

export default App;
