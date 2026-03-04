# 🍮 JellyType

**JellyType**는 Matter.js 물리 엔진과 Web Audio API를 활용한 인터랙티브 타이핑 플레이그라운드입니다. 입력하는 모든 문자가 쫀득한 젤리 객체가 되어 화면에 쏟아지며, 감각적인 비주얼과 절차적 사운드를 통해 독특한 사용자 경험을 제공합니다.

---

## ✨ 핵심 기능 (Key Features)

### 1. 고급 젤리 물리 시뮬레이션

- **Squash & Stretch:** 이동 속도와 방향에 따라 실시간으로 형태가 변형되어 실제 젤리 같은 탄성을 보여줍니다.
- **Sticky Viscosity:** 젤리들이 벽이나 바닥에 부딪힐 때 끈적하게 미끄러지는 점성 효과를 구현했습니다.
- **Jelly Merge:** 같은 문자의 젤리가 충돌하면 더 거대한 젤리로 진화하는 합성 시스템이 포함되어 있습니다.

### 2. 인터랙티브 조작 (Interactions)

- **Viscous Magnet Mode:** 마우스 커서를 따라 젤리들이 끈끈하게 뭉치는 지능형 자석 모드를 지원합니다.
- **Mobile Gyroscope:** 모바일 기기에서 기기를 기울여 중력의 방향을 실시간으로 조절할 수 있습니다.
- **Responsive Scaling:** 화면 크기에 맞춰 젤리의 크기와 물리력이 자동으로 최적화됩니다.

### 3. 고품질 렌더링 및 사운드

- **Glossy Textures:** 가독성을 유지하면서도 투명하고 반짝이는 젤리 질감을 Canvas API로 정교하게 렌더링합니다.
- **Flavor Themes:** Strawberry, Soda, Lemon Lime 등 5가지 젤리 맛 테마를 제공합니다.
- **Procedural Audio:** 풍선 소리가 아닌, 맑고 탱글한 '블롭' 사운드를 실시간 Oscillator로 합성하여 출력합니다.

---

## 🚀 기술적 도전 과제 (Engineering Challenges)

### 가독성과 질감의 공존

글자에 광택 하이라이트를 줄 때 내부 구멍이 채워지는 문제를 해결하기 위해 `globalCompositeOperation = 'source-atop'`을 활용한 이중 마스킹 기법을 설계했습니다. 이를 통해 복잡한 글자 모양을 유지하면서 내부 질감만 입힐 수 있었습니다.

### 고성능 물리 렌더링 최적화

수백 개의 젤리가 동시에 움직여도 60fps를 유지하기 위해, 객체 생성 시점에 고해상도 이미지를 Offscreen Canvas에 미리 그려두는 **Bitmap Caching** 기법을 적용했습니다.

---

## 🎮 실행 방법 (Local Setup)

프로젝트를 로컬 환경에서 실행하려면 아래 명령어를 순서대로 입력하세요.

1. **저장소 클론 및 폴더 이동**

   ```bash
   git clone [your-repo-url]
   cd jellytype
   ```

2. **의존성 설치**

   ```bash
   npm install
   ```

3. **개발 서버 실행**

   ```bash
   npm run dev
   ```

4. **빌드 (프로덕션)**
   ```bash
   npm run build
   ```

---

## 📜 라이선스 (License)

이 프로젝트는 [MIT License](LICENSE)를 따릅니다. 개인적/상업적 용도로 자유롭게 활용하세요.

Developed by [230]
