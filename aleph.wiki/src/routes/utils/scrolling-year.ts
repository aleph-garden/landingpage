/**
 * Scrolling Year Effect
 * Animates year digits with a slot-machine style scrolling effect
 */

export class ScrollingYear {
  private container: HTMLElement;
  private timelineItem: HTMLElement | null = null;
  private currentYear: number = 2025;
  private animationFrame: number | null = null;

  // Timeline configuration
  private timelineStart: Date = new Date(1945, 0, 1);
  private timelineEnd: Date = new Date(2025, 11, 31); // Extend to support future years
  private timelineHeight: number = 1600;

  constructor(container: HTMLElement, timelineStart?: Date, timelineEnd?: Date, timelineHeight?: number) {
    this.container = container;

    // Find the parent timeline-item
    this.timelineItem = container.closest('.timeline-item') as HTMLElement;

    // Override timeline config if provided
    if (timelineStart) this.timelineStart = timelineStart;
    if (timelineEnd) this.timelineEnd = timelineEnd;
    if (timelineHeight) this.timelineHeight = timelineHeight;

    this.setup(this.currentYear);
  }

  private calculatePosition(year: number): number {
    const eventDate = new Date(year, 0, 1);
    const totalDuration = this.timelineEnd.getTime() - this.timelineStart.getTime();
    const eventPosition = eventDate.getTime() - this.timelineStart.getTime();
    return (eventPosition / totalDuration) * this.timelineHeight;
  }

  private addDigit(digit: string) {
    const spanList = Array(10)
      .join('0')
      .split('0')
      .map((x, j) => `<span>${j}</span>`)
      .join('');

    this.container.insertAdjacentHTML(
      'beforeend',
      `<span style="transform: translateY(-1000%)" data-value="${digit}">
        ${spanList}
      </span>`
    );

    const lastDigit = this.container.lastElementChild as HTMLElement;

    setTimeout(() => {
      lastDigit.className = 'visible';
    }, 0);
  }

  private scrollNumber(digits: string[]) {
    this.container.querySelectorAll('span[data-value]').forEach((tick, i) => {
      const element = tick as HTMLElement;
      element.style.transform = `translateY(-${100 * parseInt(digits[i])}%)`;
    });

    setTimeout(() => {
      this.container.style.width = `${digits.length * 20}px`;
    }, 100);
  }

  private setup(startNum: number) {
    const digits = startNum.toString().split('');

    for (let i = 0; i < digits.length; i++) {
      this.addDigit('0');
    }

    this.scrollNumber(['0']);

    setTimeout(() => this.scrollNumber(digits), 100);
    this.currentYear = startNum;
  }

  private interpolatePosition(startYear: number, endYear: number, duration: number = 1000) {
    if (!this.timelineItem) return;

    const startTime = performance.now();

    // Calculate actual timeline positions for both years
    const startPosition = this.calculatePosition(startYear);
    const endPosition = this.calculatePosition(endYear);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-in-out)
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Interpolate between start and end positions
      const currentPosition = startPosition + (endPosition - startPosition) * eased;

      if (this.timelineItem) {
        this.timelineItem.style.top = `${currentPosition}px`;
      }

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      }
    };

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.animationFrame = requestAnimationFrame(animate);
  }

  private update(num: number) {
    const toDigits = num.toString().split('');

    this.scrollNumber(toDigits);
    this.interpolatePosition(this.currentYear, num, 1000);
    this.currentYear = num;
  }

  public scrollToRandomYear() {
    // Generate random year between 2025 and 2095
    const newYear = Math.floor(Math.random() * (2045 - 2025 + 1)) + 2025;
    this.update(newYear);
  }

  public startAutoScroll(interval: number = 500) {
    // Recursive scroll function that loops continuously
    const scroll = () => {
      this.scrollToRandomYear();
      // Schedule next scroll after interval
      setTimeout(scroll, interval);
    };

    // Start the first scroll after a short delay
    setTimeout(scroll, 2000);
  }

  public destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}
