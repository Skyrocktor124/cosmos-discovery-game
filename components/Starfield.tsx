import React, { useEffect, useRef } from 'react';

interface StarfieldProps {
  speed: number; // 0 for static, 1 for normal, 10 for warp
}

const Starfield: React.FC<StarfieldProps> = ({ speed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const stars: { x: number; y: number; z: number; size: number }[] = [];
    const numStars = 400;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * width,
        size: Math.random() * 2
      });
    }

    let animationFrameId: number;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      // Clear with trail effect during warp
      ctx.fillStyle = speed > 5 ? 'rgba(2, 6, 23, 0.3)' : 'rgb(2, 6, 23)';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      stars.forEach(star => {
        // Move star closer
        star.z -= speed * 2;

        if (star.z <= 0) {
          star.z = width;
          star.x = Math.random() * width - width / 2;
          star.y = Math.random() * height - height / 2;
        }

        const x = cx + (star.x / star.z) * width;
        const y = cy + (star.y / star.z) * height;
        
        // Calculate size based on depth
        const size = Math.max(0.1, (1 - star.z / width) * 3 * star.size);

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const brightness = 1 - star.z / width;
          ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
          
          if (speed > 5) {
             // Warp lines
             const prevX = cx + (star.x / (star.z + speed * 10)) * width;
             const prevY = cy + (star.y / (star.z + speed * 10)) * height;
             ctx.beginPath();
             ctx.moveTo(prevX, prevY);
             ctx.lineTo(x, y);
             ctx.strokeStyle = `rgba(100, 200, 255, ${brightness})`;
             ctx.lineWidth = size;
             ctx.stroke();
          } else {
             // Dots
             ctx.beginPath();
             ctx.arc(x, y, size, 0, Math.PI * 2);
             ctx.fill();
          }
        }
      });

      // 减少动态偏好：只画一帧静态星空，不进入动画循环
      if (!reduceMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    const handleResize = () => {
      if (canvas) {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [speed]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
    />
  );
};

export default Starfield;