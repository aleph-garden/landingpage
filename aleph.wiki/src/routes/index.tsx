import { component$, useSignal, useVisibleTask$, $, Signal } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import './index.css';
import { extractAlephPath, getFallbackAlephPath } from './utils/font-loader';
import { CRTRenderer } from './utils/crt-renderer';
import { ScrollingYear } from './utils/scrolling-year';

interface TimelineEvent {
  date: Date;
  title: string;
  description: string;
  details?: string[];
  side?: 'left' | 'right';
  offset?: number;
  hiddenUntilRevealed?: boolean;
  isReference?: boolean;  // Minor reference markers
}

const translations = {
  en: {
    hero: {
      think: 'think',
      link: 'link',
      remember: 'remember',
      everything: 'everything',
    },
    terminal: {
      viewSource: 'view source',
      joinCommunity: 'join community',
    },
    controls: {
      disableFx: 'DISABLE FX',
      enableFx: 'ENABLE FX',
    },
    kb: {
      title: 'Your External Brain',
      lead1: "You've read thousands of articles. Had hundreds of insights. Spent years accumulating knowledge.",
      lead2: "But when you need that crucial piece of information?",
      gone: "Gone.",
      feature1Title: "Capture everything, instantly",
      feature1Desc: "Ideas flow in chaos. Inbox first, organize later. No friction between thought and storage.",
      feature2Title: "Connect like your brain does",
      feature2Desc: "Not folders and hierarchies. Bidirectional links. Semantic relationships. Navigate by association, not location.",
      feature3Title: "Find what you actually meant",
      feature3Desc: "Search by meaning, not just keywords. Your future self will thank you.",
    },
    promise: {
      title: "The Information Age Made a Promise",
      subtitle: "Unlimited information. Perfect recall. Connected knowledge.",
      reality: "We're finally building it.",
      quote: "We have all known people who were like 'walking encyclopedias,' clinging effortlessly to every fact they ever encountered.",
      quoteStrong: "The Memex II promises to raise every individual to that level.",
      problem1Title: "You're Drowning in Information",
      problem1Desc: "Bookmarks you'll never read. Notes scattered across apps. Brilliant insights that vanish the moment you close the tab.",
      problem1Stat: "90% of information you save is never seen again.",
      problem1Solution: "Aleph captures everything in one place. Forever searchable. Always connected.",
      problem2Title: "Ideas Die in Isolation",
      problem2Desc: "That article on neuroscience relates to your project on learning systems. But you'll never make the connection.",
      problem2Stat: "Breakthrough insights come from connecting distant ideas.",
      problem2Solution: "Bidirectional links. Semantic connections. Your knowledge becomes a living network.",
      problem3Title: "Folders Are a Lie",
      problem3Desc: "Where did you save that note? Projects? Resources? Archive? It could be anywhere. Hierarchies force choices your brain never makes.",
      problem3Stat: "You don't think in folders. Why organize that way?",
      problem3Solution: "Navigate by association. Find by meaning. Think the way your brain actually works.",
      problem4Title: "Your Data is Hostage",
      problem4Desc: "Company shuts down. Service changes pricing. They own your knowledge graph, your years of accumulated notes.",
      problem4Stat: "Google Reader. Vine. Yahoo GeoCities. Services die. Your data shouldn't.",
      problem4Solution: "Open source. Self-hosted. Export anytime. Your knowledge, your control.",
    },
    waitlist: {
      title: 'Stay Updated',
      subtitle: 'Get notified about new features, updates, and developments',
      emailPlaceholder: 'your@email.com',
      submit: 'Subscribe',
      submitting: 'Subscribing...',
      success: 'Subscribed! Check your email.',
      error: 'Something went wrong. Try again?',
    },
    footer: {
      starGithub: 'star on github',
      joinDiscord: 'join discord',
      readVision: 'read the vision',
      tagline1: 'Open source. Self-hosted. Your data, your control.',
      tagline2: 'Building the future of personal knowledge',
    }
  },
  de: {
    hero: {
      think: 'denken',
      link: 'verknüpfen',
      remember: 'erinnere dich',
      everything: 'an alles',
    },
    terminal: {
      viewSource: 'quellcode ansehen',
      joinCommunity: 'community beitreten',
    },
    controls: {
      disableFx: 'FX DEAKTIVIEREN',
      enableFx: 'FX AKTIVIEREN',
    },
    kb: {
      title: 'Dein Externes Gehirn',
      lead1: "Du hast tausende Artikel gelesen. Hunderte Einsichten gehabt. Jahre damit verbracht, Wissen zu sammeln.",
      lead2: "Aber wenn du diese entscheidende Information brauchst?",
      gone: "Weg.",
      feature1Title: "Alles sofort erfassen",
      feature1Desc: "Ideen fließen chaotisch. Erst sammeln, später organisieren. Keine Reibung zwischen Gedanke und Speicherung.",
      feature2Title: "Verknüpfen wie dein Gehirn",
      feature2Desc: "Keine Ordner, sondern Hierarchien. Bidirektionale Links. Semantische Beziehungen. Navigation durch Assoziation, nicht durch Speicherort.",
      feature3Title: "Finden was du meintest",
      feature3Desc: "Suche nach Bedeutung, nicht nur nach Stichworten. Dein zukünftiges Ich wird es dir danken.",
    },
    promise: {
      title: "Das Informationszeitalter hat uns ein Versprechen gegeben",
      subtitle: "Unbegrenzte Information. Perfekte Erinnerung. Vernetztes Wissen.",
      reality: "Wir bauen es endlich.",
      quote: "Wir alle kennen Menschen, die wie 'wandelnde Enzyklopädien' sind und mühelos an jeder Tatsache festhalten, der sie je begegnet sind.",
      quoteStrong: "Der Memex II verspricht, jedes Individuum auf dieses Niveau zu heben.",
      problem1Title: "Du ertrinkst in Information",
      problem1Desc: "Lesezeichen, die du nie lesen wirst. Notizen über Apps verstreut. Brillante Einsichten, die verschwinden, sobald du den Tab schließt.",
      problem1Stat: "90% der gespeicherten Information siehst du nie wieder.",
      problem1Solution: "Aleph erfasst alles an einem Ort. Für immer durchsuchbar. Immer verbunden.",
      problem2Title: "Ideen sterben in Isolation",
      problem2Desc: "Dieser Artikel über Neurowissenschaft bezieht sich auf dein Projekt über Lernsysteme. Aber du wirst die Verbindung nie herstellen.",
      problem2Stat: "Durchbruch-Einsichten entstehen durch Verbindung entfernter Ideen.",
      problem2Solution: "Bidirektionale Links. Semantische Verbindungen. Dein Wissen wird ein lebendiges Netzwerk.",
      problem3Title: "Ordner sind eine Lüge",
      problem3Desc: "Wo hast du diese Notiz gespeichert? Projekte? Ressourcen? Archiv? Es könnte überall sein. Hierarchien erzwingen Entscheidungen, die dein Gehirn so nie trifft.",
      problem3Stat: "Du denkst nicht in Ordnern. Warum so organisieren?",
      problem3Solution: "Navigation durch Assoziation. Finden durch Bedeutung. Denken wie dein Gehirn tatsächlich arbeitet.",
      problem4Title: "Deine Daten sind Geisel",
      problem4Desc: "Firma schließt. Service ändert Preise. Sie besitzen deinen Wissensgraph, deine jahrelang gesammelten Notizen.",
      problem4Stat: "Google Reader. Vine. Yahoo GeoCities. Services sterben. Deine Daten sollten es nicht.",
      problem4Solution: "Open Source. Selbst gehostet. Jederzeit exportieren. Dein Wissen, deine Kontrolle.",
    },
    waitlist: {
      title: 'Bleib Informiert',
      subtitle: 'Erhalte Benachrichtigungen über neue Features, Updates und Entwicklungen',
      emailPlaceholder: 'deine@email.de',
      submit: 'Abonnieren',
      submitting: 'Wird abonniert...',
      success: 'Abonniert! Prüfe deine E-Mail.',
      error: 'Etwas ist schief gelaufen. Nochmal versuchen?',
    },
    footer: {
      starGithub: 'auf github markieren',
      joinDiscord: 'discord beitreten',
      readVision: 'vision lesen',
      tagline1: 'Open Source. Selbst gehostet. Deine Daten, deine Kontrolle.',
      tagline2: 'Die Zukunft des persönlichen Wissens',
    }
  },
  vn: {
    hero: {
      think: 'suy nghĩ',
      link: 'kết nối',
      remember: 'ghi nhớ',
      everything: 'mọi thứ',
    },
    terminal: {
      viewSource: 'Xem nguồn',
      joinCommunity: 'Cộng đồng',
    },
    controls: {
      disableFx: 'ẨN FX', // Đồ họa
      enableFx: 'BẬT FX',
    },
    kb: {
      title: 'Bộ não bên ngoài của bạn',
      lead1: "Bạn ĐÃ đọc hàng ngàn bài báo. ĐÃ có hàng tá nhận định đúc kết. ĐÃ dành nhiều năm để tích lũy kiến thức.",
      lead2: "Nhưng khi bạn cần đến thông tin quan trọng đó?",
      gone: "Biến mất!",
      feature1Title: "Ghi lại mọi thứ, ngay lập tức",
      feature1Desc: "Ý tưởng tuôn trào một cách hỗn loạn. Hộp thư đến dồn dập trước, sắp xếp chầm chậm theo sau. Không có sự mâu thuẫn giữa ý tưởng và việc lưu trữ.",
      feature2Title: "Kết nối, như cách bộ não của bạn vận hành vậy.",
      feature2Desc: "Không thư mục, không cấu trúc phân cấp. Liên kết hai chiều. Mối quan hệ ngữ nghĩa. Điều hướng theo liên kết, không phải theo vị trí.",
      feature3Title: "Hãy tìm lại điều bạn thực sự muốn nói",
      feature3Desc: "Hãy tìm kiếm theo ý nghĩa, chứ không chỉ dựa vào từ khóa. Chính bạn trong tương lai sẽ cảm ơn điều đó.",
    },
    promise: {
      title: "Kỷ nguyên thông tin đã đưa ra một lời hứa",
      subtitle: "Thông tin không giới hạn. Khả năng ghi nhớ hoàn hảo. Kiến thức được kết nối.",
      reality: "Cuối cùng thì chúng ta cũng đang xây dựng nó.",
      quote: "Chúng ta đều từng quen biết những người giống như 'bách khoa toàn thư biết đi', dễ dàng nắm bắt mọi thông tin mà họ từng gặp.",
      quoteStrong: "Memex II hứa hẹn sẽ nâng tầm mỗi cá nhân lên đẳng cấp đó.",
      problem1Title: "Bạn đang tắm trong thông tin",
      problem1Desc: "Thẻ đánh dấu trang, rồi chỉ dừng lại đó không. Ghi chú, nằm rải rác khắp các ứng dụng. Những ý tưởng tuyệt vời, chẳng còn gì khi bạn đóng tab.",
      problem1Stat: "90% thông tin bạn lưu trữ sẽ không bao giờ được xem lại.",
      problem1Solution: "Aleph lưu trữ mọi thứ ở cùng một nơi. Luôn có thể tìm kiếm. Luôn được kết nối.",
      problem2Title: "Ý tưởng sẽ chết khi bị cô lập",
      problem2Desc: "Bài báo về thần kinh học có liên quan đến dự án về hệ thống học tập của bạn, nhưng bạn sẽ không bao giờ tìm ra mối liên hệ đó.",
      problem2Stat: "Tạo ra những hiểu biết đột phá từ việc kết nối những ý tưởng tưởng chừng như xa vời.",
      problem2Solution: "Các liên kết hai chiều. Các kết nối ngữ nghĩa. Kiến thức của bạn trở thành một mạng lưới sống động.",
      problem3Title: "Thư mục là một lời nói dối",
      problem3Desc: "Bạn đã lưu ghi chú đó ở đâu? Dự án? Tài nguyên? Kho lưu trữ? Nó có thể ở bất cứ đâu. Cấu trúc phân cấp buộc bạn phải đưa ra những lựa chọn mà bộ não bạn không bao giờ tự nghĩ ra.",
      problem3Stat: "Bạn không suy nghĩ theo kiểu thư mục. Tại sao lại sắp xếp theo cách đó?",
      problem3Solution: "Tìm kiếm bằng liên tưởng. Tìm kiếm bằng ý nghĩa.\nSuy nghĩ bằng cách bộ não bạn thực sự hoạt động.",
      problem4Title: "Dữ liệu của bạn đang bị giam giữ",
      problem4Desc: "Công ty đóng cửa. Dịch vụ thay đổi giá cả. Họ sở hữu biểu đồ kiến ​​thức của bạn, những ghi chú bạn đã tích lũy trong nhiều năm.",
      problem4Stat: "Google Reader. Vine. Yahoo GeoCities. Các dịch vụ có thể biến mất. Nhưng dữ liệu của bạn thì không nên.",
      problem4Solution: "Mã nguồn mở. Tự lưu trữ. Xuất dữ liệu mọi lúc. Kiến thức của bạn, quyền kiểm soát chỉ có bạn.",
    },
    waitlist: {
      title: 'Luôn được cập nhật',
      subtitle: 'Nhận thông báo về các tính năng mới, bản cập nhật và phát triển',
      emailPlaceholder: 'your@email.com',
      submit: 'Đăng ký',
      submitting: 'Đang đăng kí...',
      success: 'Thành công! Kiểm tra email của bạn.',
      error: 'Đã xảy ra lỗi. Vui lòng thử lại?',
    },
    footer: {
      starGithub: 'đánh giá trên github',
      joinDiscord: 'Tham gia cộng đồng discord',
      readVision: 'đọc thêm về ý tưởng',
      tagline1: 'Mã nguồn mở. Tự lưu trữ. Dữ liệu của bạn, quyền kiểm soát thuộc về bạn.',
      tagline2: 'Xây dựng tương lai của tri thức cá nhân',
    }
  }
};

type FXMode = 'OFF' | 'MID' | 'HIG';

export default component$(() => {
  const fxMode = useSignal<FXMode>('MID');
  const language = useSignal<'en' | 'de' | 'vn'>('en');
  const mobileMenuOpen = useSignal(false);

  // Timeline configuration
  const timelineStart = new Date(1945, 0, 1);
  const timelineEnd = new Date(2025, 11, 31);
  const timelineHeight = 1600; // pixels

  // Timeline events data
  const timelineEvents: TimelineEvent[] = [
    {
      date: new Date(1945, 0, 1),
      title: "The Vision",
      offset: -60,
      description: "Vannevar Bush's <strong>Memex</strong> - a device to store all knowledge and navigate by association, not hierarchy"
    },
    {
      date: new Date(1951, 0, 1),
      title: "UNIVAC I",
      side: 'left',
      description: "First commercial computer",
      isReference: true
    },
    {
      date: new Date(1960, 0, 1),
      side: 'right',
      offset: -150,
      title: "The Hypertext Dream",
      description: "Ted Nelson's <strong>Project Xanadu</strong> - bidirectional links, transclusion, versioning. The promise of a truly connected information space that was never fully realized.",
      hiddenUntilRevealed: true
    },
    {
      date: new Date(1968, 0, 1),
      side: 'left',
      offset: -50,
      title: "The Demo",
      description: "Douglas Engelbart's <strong>NLS/Augment</strong> - \"The Mother of All Demos\" showcased hypertext, the mouse, and collaborative editing. A glimpse of human-computer symbiosis."
    },
    {
      date: new Date(1973, 0, 1),
      title: "Xerox Alto",
      description: "First computer with GUI",
      isReference: true
    },
    {
      date: new Date(1983, 0, 1),
      title: "TCP/IP",
      description: "Internet protocol standardized",
      isReference: true
    },
    {
      date: new Date(1989, 0, 1),
      offset: -70,
      title: "The Compromise",
      description: "Tim Berners-Lee's <strong>World Wide Web</strong> - democratized information sharing, but with one-way links and no native version control. A necessary simplification."
    },
    {
      date: new Date(1993, 0, 1),
      side: 'left',
      title: "Mosaic",
      description: "First popular graphical web browser",
      isReference: true
    },
    {
      date: new Date(1998, 8, 4),
      title: "Google",
      side: 'right',
      description: "PageRank algorithm launched",
      isReference: true
    },
    {
      date: new Date(2001, 0, 15),
      title: "Wikipedia launches",
      description: "Collaborative knowledge begins",
      isReference: true
    },
    {
      date: new Date(2005, 0, 1),
      title: "The Blueprint",
      offset: -150,
      side: 'right',
      description: "<em>\"Building the memex sixty years later\"</em> - Davies, Stephen, Velez-Morales, Javier; King, Roger formalized the design goals:",
      details: [
        "Works like the brain thinks",
        "Supports formality and informality",
        "Immediate retrieval",
        "Bridges objective-subjective knowledge"
      ]
    },
    {
      date: new Date(2008, 9, 31),
      title: "Bitcoin",
      description: "Whitepaper published",
      isReference: true
    },
    {
      date: new Date(2016, 2, 9),
      title: "AlphaGo",
      description: "AI defeats world champion",
      isReference: true
    },
    {
      date: new Date(2020, 0, 1),
      side: 'left',
      offset: -170,
      title: "The Renaissance",
      description: "Personal Knowledge Management renaissance - Roam Research, Obsidian, Logseq. Bidirectional links return. The graph becomes visible. The dream starts to materialize for individuals."
    },
    {
      date: new Date(2025, 0, 1),
      side: 'right',
      title: "Aleph",
      description: "<strong>\"Eighty years later, the technology caught up.\"</strong><br>Aleph realizes the vision: the federated, semantic web we deserve. What Project Xanadu promised, what memex imagined."
    }
  ];

  // Calculate position on timeline based on date
  const calculatePosition = (eventDate: Date): number => {
    const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
    const eventPosition = eventDate.getTime() - timelineStart.getTime();
    return (eventPosition / totalDuration) * timelineHeight;
  };

  // Load Font Awesome Kit
  useVisibleTask$(() => {
    // Load Font Awesome if not already loaded
    if (!document.querySelector('script[src*="fontawesome"]')) {
      const script = document.createElement('script');
      script.src = 'https://kit.fontawesome.com/b9c35f09e1.js';
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  });

  // Load visuals and language preferences
  useVisibleTask$(() => {
    // Load FX mode preference from localStorage or default to MID
    const savedMode = localStorage.getItem('aleph-fx-mode') as FXMode | null;
    const initialMode: FXMode = savedMode && ['OFF', 'MID', 'HIG'].includes(savedMode) ? savedMode : 'MID';
    fxMode.value = initialMode;
    document.documentElement.setAttribute('data-fx-mode', initialMode.toLowerCase());

    // Load language preference from localStorage or default to English
    const savedLanguage = localStorage.getItem('language') as 'en' | 'de' | 'vn' | null;
    if (savedLanguage) {
      language.value = savedLanguage;
    }
  });

  // XYScope effect for light mode - DISABLED FOR NOW
  /* useVisibleTask$(async ({ cleanup }) => {
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const container = document.querySelector('.aleph-logo-container');

    if (!isLightMode || !container) return;

    // Load p5.js library dynamically
    const loadP5 = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (typeof (window as any).p5 !== 'undefined') {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load p5.js'));
        document.head.appendChild(script);
      });
    };

    // Load xyscope library dynamically
    const loadXYScope = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (typeof (window as any).XYscope !== 'undefined') {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/gh/ffd8/xyscopejs/xyscope.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load XYScope'));
        document.head.appendChild(script);
      });
    };

    try {
      // Load p5.js first, then xyscope
      await loadP5();
      console.log('p5.js loaded');
      await loadXYScope();
      console.log('xyscope loaded');

      // Create canvas for xyscope
      const canvas = document.createElement('canvas');
      canvas.className = 'xyscope-canvas';
      canvas.id = 'aleph-scope';
      const rect = container.getBoundingClientRect();
      canvas.width = 600;
      canvas.height = 600;
      canvas.style.position = 'absolute';
      canvas.style.top = '50%';
      canvas.style.left = '50%';
      canvas.style.transform = 'translate(-50%, -50%)';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);

      // Initialize XYScope with p5
      const p5 = (window as any).p5;
      const XYscope = (window as any).XYscope;
      const scope = new XYscope(p5);

      // Get the Aleph path
      const path = getFallbackAlephPath(600, 600);

      // Convert path to XYScope format (array of [x, y] points)
      const scopePoints = path.map(p => [p.x, p.y]);

      // Configure and start the scope
      scope.draw(scopePoints, {
        color: [214, 64, 69], // Red color for light mode
        weight: 2,
        glow: true,
        decay: 0.97,
        scanSpeed: 0.5,
        detail: 1
      });

      cleanup(() => {
        canvas.remove();
      });
    } catch (error) {
      console.error('Failed to initialize XYScope:', error);
    }
  }); */

  // Advanced multi-layer RGB glitch system
  useVisibleTask$(({ track, cleanup }) => {
    track(() => fxMode.value);

    const container = document.querySelector('.aleph-logo-container');
    const mainLogo = document.querySelector('.aleph-logo');
    if (!container || !mainLogo) return;

    // Clean up existing glitch layers to prevent accumulation
    const existingWrappers = container.querySelectorAll('.red-channel-wrapper, .cyan-channel-wrapper, .green-channel-wrapper');
    existingWrappers.forEach(wrapper => wrapper.remove());

    // Adjust slice count based on mode
    const sliceCountMap: Record<FXMode, number> = {
      'OFF': 0,   // No layers for OFF mode
      'MID': 0,   // No glitch layers for MID mode (only breathing glow)
      'HIG': 40   // Full layers for HIG mode
    };
    const sliceCount = sliceCountMap[fxMode.value];
    const layers: { element: HTMLElement; type: 'red' | 'cyan' | 'green' }[] = [];

    // Create RGB channel layers with multiple slices each
    ['red', 'cyan', 'green'].forEach((channelType) => {
      for (let i = 0; i < sliceCount; i++) {
        // Wrapper allows glow to extend beyond clip-path
        const wrapper = document.createElement('div');
        wrapper.className = `${channelType}-channel-wrapper`;
        wrapper.style.position = 'absolute';
        wrapper.style.top = '0';
        wrapper.style.left = '0';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.overflow = 'visible';
        wrapper.style.pointerEvents = 'none';

        const slice = document.createElement('div');
        slice.className = `aleph-slice ${channelType}-channel`;
        slice.textContent = 'ℵ';
        const topPercent = (i / sliceCount) * 100;
        const heightPercent = 100 / sliceCount;
        slice.style.clipPath = `polygon(0% ${topPercent}%, 100% ${topPercent}%, 100% ${topPercent + heightPercent}%, 0% ${topPercent + heightPercent}%)`;

        wrapper.appendChild(slice);
        container.appendChild(wrapper);
        layers.push({ element: slice, type: channelType as 'red' | 'cyan' | 'green' });
      }
    });

    // Glitch effect types
    const effects = {
      // Type 1: Chromatic aberration - RGB channel separation (more intense)
      chromaticShift: () => {
        const intensity = 5 + Math.random() * 18;
        layers.forEach(({ element, type }) => {
          if (Math.random() > 0.75) {
            const offset = type === 'red' ? -intensity : type === 'cyan' ? intensity : 0;
            const skew = (Math.random() - 0.5) * 2;
            element.style.transform = `translateX(${offset}px) skewX(${skew}deg)`;
            element.style.filter = `blur(${Math.random() * 0.5}px)`;
          }
        });
      },

      // Type 2: Digital corruption - random block displacements (more horizontal movement)
      blockCorruption: () => {
        const blockSize = 5 + Math.floor(Math.random() * 10);
        layers.forEach(({ element }, i) => {
          if (i % blockSize === 0 && Math.random() > 0.6) {
            const offset = (Math.random() - 0.5) * 50;
            const scale = 0.95 + Math.random() * 0.1;
            element.style.transform = `translateX(${offset}px) scaleX(${scale})`;
            element.style.opacity = String(0.6 + Math.random() * 0.4);
          }
        });
      },

      // Type 3: Scanline interference (more sideways movement)
      scanlineJitter: () => {
        layers.forEach(({ element }, i) => {
          if (Math.random() > 0.85) {
            const offset = (Math.random() - 0.5) * 20;
            element.style.transform = `translateX(${offset}px)`;
            element.style.filter = `brightness(${0.8 + Math.random() * 0.4})`;
          }
        });
      },

      // Type 4: Signal wave distortion
      waveDistortion: () => {
        const phase = Math.random() * Math.PI * 2;
        layers.forEach(({ element }, i) => {
          const wave = Math.sin(i * 0.3 + phase) * 6;
          element.style.transform = `translateX(${wave}px)`;
        });
      },

      // Type 5: Heavy corruption burst
      corruptionBurst: () => {
        const affectedStart = Math.floor(Math.random() * (sliceCount - 10));
        layers.forEach(({ element }, i) => {
          const sliceIndex = Math.floor(i / 3);
          if (sliceIndex >= affectedStart && sliceIndex < affectedStart + 10) {
            const offset = (Math.random() - 0.5) * 40;
            const rotation = (Math.random() - 0.5) * 5;
            element.style.transform = `translateX(${offset}px) rotate(${rotation}deg)`;
            element.style.filter = `contrast(${0.5 + Math.random()})`;
          }
        });
      },

      // Type 6: Half split flicker - top or bottom half glitches
      halfSplitFlicker: () => {
        const splitTop = Math.random() > 0.5;
        const flickerOffset = (Math.random() - 0.5) * 30;
        const flickerIntensity = 3 + Math.random() * 6;

        layers.forEach(({ element }, i) => {
          const sliceIndex = Math.floor(i / 3);
          const isAffectedHalf = splitTop ? sliceIndex < sliceCount / 2 : sliceIndex >= sliceCount / 2;

          if (isAffectedHalf) {
            element.style.transform = `translateX(${flickerOffset}px)`;
            element.style.filter = `brightness(${1.2 + Math.random() * 0.3})`;
            element.style.opacity = String(0.7 + Math.random() * 0.3);

            // Extra flicker for some slices
            if (Math.random() > 0.7) {
              element.style.transform = `translateX(${flickerOffset + (Math.random() - 0.5) * 15}px)`;
            }
          }
        });
      },

      // Type 7: Heavy horizontal displacement
      massiveShift: () => {
        layers.forEach(({ element }, i) => {
          if (Math.random() > 0.8) {
            const offset = (Math.random() - 0.5) * 60;
            element.style.transform = `translateX(${offset}px)`;
          }
        });
      }
    };

    // Reset function
    const resetLayers = () => {
      layers.forEach(({ element }) => {
        element.style.transform = '';
        element.style.filter = '';
        element.style.opacity = '';
      });
    };

    // Container shake effect
    const shakeContainer = () => {
      if (Math.random() > 0.7) {
        const shakeX = (Math.random() - 0.5) * 4;
        const shakeY = (Math.random() - 0.5) * 4;
        const rotation = (Math.random() - 0.5) * 0.5;
        (container as HTMLElement).style.transform = `translate(${shakeX}px, ${shakeY}px) rotate(${rotation}deg)`;
        (container as HTMLElement).style.transition = 'transform 30ms ease-out';

        setTimeout(() => {
          (container as HTMLElement).style.transform = '';
        }, 30);
      }
    };

    // Track timeout IDs for cleanup
    let glitchTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let burstTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let shakeTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let isActive = true;

    // Main glitch loop
    const glitchLoop = () => {
      if (!isActive) return;

      const mode = fxMode.value;

      // Apply effects based on mode (HIG only)
      if (mode === 'HIG') {
        // Randomly trigger different effects
        const effectTypes = Object.values(effects);
        const selectedEffect = effectTypes[Math.floor(Math.random() * effectTypes.length)];

        if (Math.random() > 0.3) {
          selectedEffect();
          shakeContainer();

          // Quick reset after brief display
          setTimeout(() => {
            if (isActive) resetLayers();
          }, 40 + Math.random() * 40);
        }

        // Occasionally combine effects
        if (Math.random() > 0.85) {
          effects.chromaticShift();
          setTimeout(() => {
            if (!isActive) return;
            effects.scanlineJitter();
            setTimeout(() => {
              if (isActive) resetLayers();
            }, 50);
          }, 20);
        }

        // Apply with faster transition
        layers.forEach(({ element }) => {
          element.style.transition = 'all 40ms cubic-bezier(0.4, 0, 0.2, 1)';
        });
      } else {
        // Reset all layers when in OFF or MID mode
        resetLayers();
      }

      // Random timing between glitches
      const nextGlitch = Math.random() > 0.7 ? 80 + Math.random() * 150 : 200 + Math.random() * 600;
      glitchTimeoutId = setTimeout(glitchLoop, nextGlitch);
    };

    // Intense glitch burst occasionally
    const burstLoop = () => {
      if (!isActive) return;

      const mode = fxMode.value;

      // Only apply bursts in HIG mode
      if (mode === 'HIG') {
        const rand = Math.random();
        if (rand > 0.85) {
          effects.corruptionBurst();
          shakeContainer();
          setTimeout(() => {
            if (isActive) resetLayers();
          }, 60);
        } else if (rand > 0.75) {
          effects.halfSplitFlicker();
          shakeContainer();
          setTimeout(() => {
            if (isActive) resetLayers();
          }, 50);
        } else if (rand > 0.65) {
          effects.massiveShift();
          shakeContainer();
          setTimeout(() => {
            if (isActive) resetLayers();
          }, 55);
        }
      }
      burstTimeoutId = setTimeout(burstLoop, 1500 + Math.random() * 2500);
    };

    // Continuous subtle shake
    const continuousShake = () => {
      if (!isActive) return;

      const mode = fxMode.value;

      // Only shake in HIG mode
      if (mode === 'HIG') {
        shakeContainer();
      }
      shakeTimeoutId = setTimeout(continuousShake, 100 + Math.random() * 200);
    };

    glitchLoop();
    burstLoop();
    continuousShake();

    // Cleanup function to stop all loops
    cleanup(() => {
      isActive = false;
      if (glitchTimeoutId) clearTimeout(glitchTimeoutId);
      if (burstTimeoutId) clearTimeout(burstTimeoutId);
      if (shakeTimeoutId) clearTimeout(shakeTimeoutId);
    });
  });

  // Initialize scrolling year effect
  useVisibleTask$(() => {
    // Wait for element to be in DOM
    const initScrollingYear = () => {
      const yearContainer = document.querySelector('.scrolling-year-container');

      if (!yearContainer) {
        setTimeout(initScrollingYear, 100);
        return;
      }

      // Pass timeline configuration to ScrollingYear
      const scrollingYear = new ScrollingYear(
        yearContainer as HTMLElement,
        timelineStart,
        timelineEnd,
        timelineHeight
      );

      // Start auto-scrolling every second or so
      scrollingYear.startAutoScroll(1500);
    };

    initScrollingYear();
  });

  const cycleFXMode = $(() => {
    const modes: FXMode[] = ['OFF', 'MID', 'HIG'];
    const currentIndex = modes.indexOf(fxMode.value);
    const nextIndex = (currentIndex + 1) % modes.length;
    fxMode.value = modes[nextIndex];
    document.documentElement.setAttribute('data-fx-mode', fxMode.value.toLowerCase());
    localStorage.setItem('aleph-fx-mode', fxMode.value);
    // Close mobile menu after selection
    mobileMenuOpen.value = false;
  });

  const toggleLanguage = $(() => {
    language.value = language.value === 'en' ? 'de' : language.value === 'de' ? 'vn' : 'en';
    localStorage.setItem('language', language.value);
    // Close mobile menu after selection
    mobileMenuOpen.value = false;
  });

  const toggleMobileMenu = $(() => {
    mobileMenuOpen.value = !mobileMenuOpen.value;
  });

  const t = translations[language.value];

  return (
    <>
      {/* Burger Menu Button - Mobile Only */}
      <button
        class="burger-menu"
        onClick$={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        <span class={mobileMenuOpen.value ? 'burger-line open' : 'burger-line'}></span>
        <span class={mobileMenuOpen.value ? 'burger-line open' : 'burger-line'}></span>
        <span class={mobileMenuOpen.value ? 'burger-line open' : 'burger-line'}></span>
      </button>

      {/* Mobile Menu Overlay */}
      <div class={mobileMenuOpen.value ? 'mobile-menu-overlay open' : 'mobile-menu-overlay'} onClick$={toggleMobileMenu}></div>

      {/* Controls - Top Right (Desktop) / Mobile Menu (Mobile) */}
      <div class={mobileMenuOpen.value ? 'controls mobile-menu-open' : 'controls'}>
        <button
          class="control-btn"
          onClick$={cycleFXMode}
          aria-label="Cycle FX quality mode"
        >
          [FX: {fxMode.value}]
        </button>
        <button
          class="control-btn"
          onClick$={toggleLanguage}
          aria-label="Toggle language"
        >
          [{language.value === 'en' ? 'EN' : language.value === 'de' ? 'DE' : 'VN'}]
        </button>
      </div>

      {/* Terminal Prompt */}
      <div class="terminal-prompt">
        <span class="prompt-dim">you@</span><span class="prompt-bright">ℵ.wiki</span><span class="prompt-dim">:~</span><span class="prompt-bright">$</span> <span class="cursor">_</span>
      </div>


      {/* Hero Section */}
      <section class="hero">
        <div class="matrix-bg"></div>
        <div class="hero-content">
          <div class="hero-left">
            <h1 class="hero-text">
              <span class="hero-line">{t.hero.think}<span class="dot">.</span></span>
              <span class="hero-line">{t.hero.link}<span class="dot">.</span></span>
              <span class="hero-line"><span class="indent-text">{t.hero.remember}</span> {t.hero.everything}<span class="dot">.</span></span>
            </h1>
          </div>
          <div class="hero-right">
            <div class="aleph-logo-container">
              {/*<div class="aleph-logo">ℵ</div>*/}
            </div>
          </div>
        </div>
        <div class="cta-buttons">
          <a href="https://github.com/aleph-garden/memex" class="btn-terminal" target="_blank" rel="noopener noreferrer">
            [&gt; {t.terminal.viewSource}]
          </a>
          <a href="https://discord.gg/K93n8exUWj" class="btn-terminal" target="_blank" rel="noopener noreferrer">
            [&gt; {t.terminal.joinCommunity}]
          </a>
        </div>
      </section>

      {/* Knowledge Base Section */}
      <section class="kb-section">
        <h2 class="section-title glitch-hover">{t.kb.title}</h2>
        <div class="section-content">
          <div class="kb-intro">
            <p class="kb-lead">{t.kb.lead1}</p>
            <p class="kb-lead">{t.kb.lead2} <em>{t.kb.gone}</em></p>
          </div>

          <div class="kb-features">
            <div class="feature-item">
              <span class="feature-icon">⚡</span>
              <div class="feature-text">
                <strong>{t.kb.feature1Title}</strong>
                <p>{t.kb.feature1Desc}</p>
              </div>
            </div>

            <div class="feature-item">
              <span class="feature-icon">🕸️</span>
              <div class="feature-text">
                <strong>{t.kb.feature2Title}</strong>
                <p>{t.kb.feature2Desc}</p>
              </div>
            </div>

            <div class="feature-item">
              <span class="feature-icon">🔍</span>
              <div class="feature-text">
                <strong>{t.kb.feature3Title}</strong>
                <p>{t.kb.feature3Desc}</p>
              </div>
            </div>
          </div>

          <div class="knowledge-graph">
            <svg viewBox="0 0 800 500" class="graph-svg">
              <defs>
                {/* Glow filter for nodes */}
                <filter id="node-glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                {/* Gradient for particles */}
                <radialGradient id="particle-gradient">
                  <stop offset="0%" stop-color="var(--accent)" stop-opacity="1"/>
                  <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
                </radialGradient>
              </defs>

              {/* Background grid pattern */}
              <g class="grid-pattern" opacity="0.05">
                <line x1="0" y1="0" x2="800" y2="500" stroke="var(--accent)" stroke-width="1"/>
                <line x1="0" y1="500" x2="800" y2="0" stroke="var(--accent)" stroke-width="1"/>
                <circle cx="400" cy="250" r="150" fill="none" stroke="var(--accent)" stroke-width="1"/>
                <circle cx="400" cy="250" r="250" fill="none" stroke="var(--accent)" stroke-width="1"/>
              </g>

              {/* Layer 1: Background connections */}
              <g class="connection-layer layer-1">
                <line class="graph-line line-bg-1" x1="150" y1="250" x2="650" y2="250" />
                <line class="graph-line line-bg-2" x1="400" y1="100" x2="400" y2="400" />
                <line class="graph-line line-bg-3" x1="200" y1="150" x2="600" y2="350" />
                <line class="graph-line line-bg-4" x1="200" y1="350" x2="600" y2="150" />
              </g>

              {/* Layer 2: Primary connections - forming a neural network */}
              <g class="connection-layer layer-2">
                <line class="graph-line line-1" x1="150" y1="250" x2="280" y2="150" />
                <line class="graph-line line-2" x1="150" y1="250" x2="280" y2="350" />
                <line class="graph-line line-3" x1="280" y1="150" x2="400" y2="180" />
                <line class="graph-line line-4" x1="280" y1="150" x2="400" y2="100" />
                <line class="graph-line line-5" x1="280" y1="350" x2="400" y2="320" />
                <line class="graph-line line-6" x1="280" y1="350" x2="400" y2="400" />
                <line class="graph-line line-7" x1="400" y1="100" x2="520" y2="150" />
                <line class="graph-line line-8" x1="400" y1="180" x2="520" y2="150" />
                <line class="graph-line line-9" x1="400" y1="320" x2="520" y2="350" />
                <line class="graph-line line-10" x1="400" y1="400" x2="520" y2="350" />
                <line class="graph-line line-11" x1="520" y1="150" x2="650" y2="250" />
                <line class="graph-line line-12" x1="520" y1="350" x2="650" y2="250" />
                <line class="graph-line line-13" x1="400" y1="180" x2="400" y2="320" />
                <line class="graph-line line-14" x1="280" y1="150" x2="400" y2="250" />
                <line class="graph-line line-15" x1="280" y1="350" x2="400" y2="250" />
              </g>

              {/* Animated particles traveling along connections */}
              <g class="particles-layer">
                <circle class="particle particle-1" r="3" fill="url(#particle-gradient)">
                  <animateMotion dur="4s" repeatCount="indefinite">
                    <mpath href="#path-1"/>
                  </animateMotion>
                </circle>
                <circle class="particle particle-2" r="3" fill="url(#particle-gradient)">
                  <animateMotion dur="5s" repeatCount="indefinite" begin="0.5s">
                    <mpath href="#path-2"/>
                  </animateMotion>
                </circle>
                <circle class="particle particle-3" r="3" fill="url(#particle-gradient)">
                  <animateMotion dur="4.5s" repeatCount="indefinite" begin="1s">
                    <mpath href="#path-3"/>
                  </animateMotion>
                </circle>
                <circle class="particle particle-4" r="3" fill="url(#particle-gradient)">
                  <animateMotion dur="3.5s" repeatCount="indefinite" begin="1.5s">
                    <mpath href="#path-4"/>
                  </animateMotion>
                </circle>
              </g>

              {/* Hidden paths for particle animation */}
              <defs>
                <path id="path-1" d="M 150 250 L 280 150 L 400 180 L 520 150 L 650 250" fill="none"/>
                <path id="path-2" d="M 150 250 L 280 350 L 400 320 L 520 350 L 650 250" fill="none"/>
                <path id="path-3" d="M 400 100 L 520 150 L 650 250 L 520 350 L 400 400" fill="none"/>
                <path id="path-4" d="M 280 150 L 400 250 L 280 350 L 150 250 L 280 150" fill="none"/>
              </defs>

              {/* Nodes - arranged in layers like a neural network */}
              <g class="nodes-layer">
                {/* Input layer */}
                <g class="node-group">
                  <circle class="graph-node node-input" cx="150" cy="250" r="10" filter="url(#node-glow)"/>
                  <circle class="graph-pulse pulse-input" cx="150" cy="250" r="10"/>
                </g>

                {/* Hidden layer 1 */}
                <g class="node-group">
                  <circle class="graph-node node-h1-1" cx="280" cy="150" r="8" filter="url(#node-glow)"/>
                  <circle class="graph-pulse pulse-h1-1" cx="280" cy="150" r="8"/>
                </g>
                <g class="node-group">
                  <circle class="graph-node node-h1-2" cx="280" cy="350" r="8" filter="url(#node-glow)"/>
                  <circle class="graph-pulse pulse-h1-2" cx="280" cy="350" r="8"/>
                </g>

                {/* Hidden layer 2 */}
                <g class="node-group">
                  <circle class="graph-node node-h2-1" cx="400" cy="100" r="7" filter="url(#node-glow)"/>
                  <circle class="graph-pulse pulse-h2-1" cx="400" cy="100" r="7"/>
                </g>
                <g class="node-group">
                  <circle class="graph-node node-h2-2" cx="400" cy="180" r="9" filter="url(#node-glow)"/>
                  <circle class="graph-pulse pulse-h2-2" cx="400" cy="180" r="9"/>
                </g>
                <g class="node-group">
                  <circle class="graph-node node-h2-3" cx="400" cy="250" r="6" filter="url(#node-glow)"/>
                  <circle class="graph-pulse pulse-h2-3" cx="400" cy="250" r="6"/>
                </g>
                <g class="node-group">
                  <circle class="graph-node node-h2-4" cx="400" cy="320" r="9" filter="url(#node-glow)"/>
                  <circle class="graph-pulse pulse-h2-4" cx="400" cy="320" r="9"/>
                </g>
                <g class="node-group">
                  <circle class="graph-node node-h2-5" cx="400" cy="400" r="7" filter="url(#node-glow)"/>
                  <circle class="graph-pulse pulse-h2-5" cx="400" cy="400" r="7"/>
                </g>

                {/* Hidden layer 3 */}
                <g class="node-group">
                  <circle class="graph-node node-h3-1" cx="520" cy="150" r="8" filter="url(#node-glow)"/>
                  <circle class="graph-pulse pulse-h3-1" cx="520" cy="150" r="8"/>
                </g>
                <g class="node-group">
                  <circle class="graph-node node-h3-2" cx="520" cy="350" r="8" filter="url(#node-glow)"/>
                  <circle class="graph-pulse pulse-h3-2" cx="520" cy="350" r="8"/>
                </g>

                {/* Output layer */}
                <g class="node-group">
                  <circle class="graph-node node-output" cx="650" cy="250" r="10" filter="url(#node-glow)"/>
                  <circle class="graph-pulse pulse-output" cx="650" cy="250" r="10"/>
                </g>
              </g>

              {/* Floating concept labels */}
              <g class="concept-labels" opacity="0.6">
                <text x="150" y="230" class="concept-label" text-anchor="middle">input</text>
                <text x="400" y="250" class="concept-label" text-anchor="middle">connect</text>
                <text x="650" y="270" class="concept-label" text-anchor="middle">insight</text>
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section class="why-section">
        <div class="promise-header">
          <h2>{t.promise.title}</h2>
          <p class="promise-subtitle">{t.promise.subtitle}</p>
          <p class="promise-reality">{t.promise.reality}</p>
        </div>

        <div class="promise-quote">
          <svg class="quote-decoration" width="60" height="60" viewBox="0 0 60 60">
            <text x="10" y="45" font-size="48" fill="currentColor" opacity="0.2">"</text>
          </svg>
          <p class="quote-text">
            {t.promise.quote}
            <strong>{t.promise.quoteStrong}</strong>
          </p>
        </div>

        <div class="problems-showcase">
          <div class="problem-item problem-1">
            <div class="problem-visual">
              <i class="fa-sharp-duotone fa-solid fa-laptop-binary problem-icon icon-1"></i>
            </div>
            <div class="problem-content">
              <h3 class="problem-title">{t.promise.problem1Title}</h3>
              <p class="problem-description">
                {t.promise.problem1Desc}
                <span class="problem-stat">{t.promise.problem1Stat}</span>
              </p>
              <div class="solution-banner">
                <span class="solution-arrow">→</span>
                <span class="solution-label">{t.promise.problem1Solution}</span>
              </div>
            </div>
          </div>

          <div class="problem-item problem-2">
            <div class="problem-visual">
              <i class="fa-sharp-duotone fa-solid fa-unlink problem-icon icon-2"></i>
            </div>
            <div class="problem-content">
              <h3 class="problem-title">{t.promise.problem2Title}</h3>
              <p class="problem-description">
                {t.promise.problem2Desc}
                <span class="problem-stat">{t.promise.problem2Stat}</span>
              </p>
              <div class="solution-banner">
                <span class="solution-arrow">→</span>
                <span class="solution-label">{t.promise.problem2Solution}</span>
              </div>
            </div>
          </div>

          <div class="problem-item problem-3">
            <div class="problem-visual">
              <i class="fa-sharp-duotone fa-solid fa-folder-open problem-icon icon-3"></i>
            </div>
            <div class="problem-content">
              <h3 class="problem-title">{t.promise.problem3Title}</h3>
              <p class="problem-description">
                {t.promise.problem3Desc}
                <span class="problem-stat">{t.promise.problem3Stat}</span>
              </p>
              <div class="solution-banner">
                <span class="solution-arrow">→</span>
                <span class="solution-label">{t.promise.problem3Solution}</span>
              </div>
            </div>
          </div>

          <div class="problem-item problem-4">
            <div class="problem-visual">
              <i class="fa-sharp-duotone fa-solid fa-alien-8bit problem-icon icon-4"></i>
            </div>
            <div class="problem-content">
              <h3 class="problem-title">{t.promise.problem4Title}</h3>
              <p class="problem-description">
                {t.promise.problem4Desc}
                <span class="problem-stat">{t.promise.problem4Stat}</span>
              </p>
              <div class="solution-banner">
                <span class="solution-arrow">→</span>
                <span class="solution-label">{t.promise.problem4Solution}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Heritage Section - HIDDEN FOR NOW */}
      {/* {semanticRevealed && <section class="heritage-section">
        <h2>Standing on the shoulders of giants</h2>

        <div class="timeline" style={`height: ${timelineHeight}px;`}>
          {timelineEvents.map((event, index) => {
            let position = calculatePosition(event.date);
            let side = event.side ? event.side : (index % 2 === 0 ? 'left' : 'right');

            // Reference markers render differently
            if (event.isReference) {
              return (
                <div
                  key={event.date.getFullYear()}
                  class="timeline-reference"
                  style={`top: ${position}px;`}
                  data-side={side}
                >
                  <div class="reference-label">
                    <span class="reference-year">{event.date.getFullYear()}</span>
                    <span class="reference-title">{event.title}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={event.date.getFullYear()}
                class='timeline-item'
                style={`top: ${position}px;`}
                data-side={side}
              >
                <div class={`timeline-year ${event.date.getFullYear() === 2025 ? 'timeline-year-present' : ''}`}>
                  {event.date.getFullYear() === 2025 ? (
                    <div class="scrolling-year-container"></div>
                  ) : (
                    event.date.getFullYear()
                  )}
                </div>
                <div class="timeline-content" style={{ position: 'absolute', top: event.offset ? `${event.offset}px` : ''}}>
                  <h3>{event.title}</h3>
                  <p dangerouslySetInnerHTML={event.description}></p>
                  {event.details && (
                    <ul>
                      {event.details.map((detail) => (
                        <li key={detail}>• {detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>} */}

      {/* Semantic Web Section - Hidden Easter Egg - DISABLED FOR NOW */}
      {/* <section class={`semantic-section ${semanticRevealed.value ? 'revealed' : 'hidden-section'}`}>
        <h2 class="section-title glitch-hover">The Federated Semantic Web</h2>
        <div class="section-content">
          <ul class="terminal-list">
            <li>&gt; Personal knowledge bases that can interconnect globally</li>
            <li>&gt; mmx:// protocol - every node addressable across the network</li>
            <li>&gt; Reference anyone's knowledge (with permission)</li>
            <li>&gt; Own your data, share what you choose</li>
            <li>&gt; "This is the federated, semantic web we deserve"</li>
          </ul>
          <div class="network-diagram">
            <div class="base-node"></div>
            <div class="base-node"></div>
            <div class="base-node"></div>
            <div class="base-node"></div>
          </div>
        </div>
      </section> */}

      {/* Waitlist Section - HIDDEN FOR NOW */}
      {/* <section class="waitlist-section">
        <div class="waitlist-container">
          <h2 class="waitlist-title">{t.waitlist.title}</h2>
          <p class="waitlist-subtitle">{t.waitlist.subtitle}</p>
          <form class="waitlist-form" preventdefault:submit onSubmit$={async (e, form) => {
            const formData = new FormData(form);
            const email = formData.get('email') as string;

            const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
            const messageEl = form.querySelector('.waitlist-message') as HTMLElement;

            if (!email || !email.includes('@')) {
              messageEl.textContent = 'Please enter a valid email address';
              messageEl.className = 'waitlist-message error';
              return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = t.waitlist.submitting;

            try {
              const response = await fetch('https://app.audienceful.com/api/people/', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Api-Key': 'YOUR_API_KEY_HERE', // Replace with actual API key
                },
                body: JSON.stringify({
                  email: email,
                }),
              });

              if (response.ok) {
                messageEl.textContent = t.waitlist.success;
                messageEl.className = 'waitlist-message success';
                form.reset();
              } else {
                throw new Error('API request failed');
              }
            } catch (error) {
              messageEl.textContent = t.waitlist.error;
              messageEl.className = 'waitlist-message error';
            } finally {
              submitBtn.disabled = false;
              submitBtn.textContent = t.waitlist.submit;
            }
          }}>
            <div class="waitlist-input-group">
              <input
                type="email"
                name="email"
                class="waitlist-input"
                placeholder={t.waitlist.emailPlaceholder}
                required
              />
              <button type="submit" class="waitlist-button">
                {t.waitlist.submit}
              </button>
            </div>
            <div class="waitlist-message"></div>
          </form>
        </div>
      </section> */}

      {/* Footer */}
      <footer class="footer">
        <div class="footer-ctas">
          <a href="https://github.com/aleph-garden/memex" class="btn-terminal" target="_blank" rel="noopener noreferrer">
            [&gt; {t.footer.starGithub}]
          </a>
          <a href="https://discord.gg/K93n8exUWj" class="btn-terminal" target="_blank" rel="noopener noreferrer">
            [&gt; {t.footer.joinDiscord}]
          </a>
          <a href="https://github.com/aleph-garden/memex/blob/main/README.md" class="btn-terminal" target="_blank" rel="noopener noreferrer">
            [&gt; {t.footer.readVision}]
          </a>
        </div>

        <div class="footer-info">
          <p>{t.footer.tagline1}</p>
          <p class="aleph-symbol">ℵ</p>
          <p>{t.footer.tagline2}</p>
        </div>
      </footer>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Aleph - Your External Brain',
  meta: [
    {
      name: 'description',
      content: 'Building Memex II: A personal knowledge base that works like the brain thinks. Open source, self-hosted, federated.',
    },
    {
      property: 'og:title',
      content: 'Aleph - Your External Brain',
    },
    {
      property: 'og:description',
      content: 'Building Memex II: A personal knowledge base that works like the brain thinks.',
    },
  ],
};
