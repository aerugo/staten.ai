import { useEffect, useRef, useState } from "react";
import { BlurFade } from "../magicui/blur-fade";

interface InstallMcpUIProps {
  onDragSuccess?: () => void;
}

export default function InstallMcpUI({ onDragSuccess }: InstallMcpUIProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOverTarget, setIsOverTarget] = useState(false);
  const sourceRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  // Use a ref to track the clone element without directly assigning to .current
  const cloneElementRef = useRef<HTMLDivElement | null>(null);

  // Use a ref to track if we're currently over the target to avoid state timing issues
  const isOverTargetRef = useRef(false);

  // Set up the drag clone when dragging starts
  useEffect(() => {
    if (isDragging && sourceRef.current) {
      const source = sourceRef.current;
      const sourceRect = source.getBoundingClientRect();

      // Create clone element
      const clone = document.createElement("div");
      clone.className =
        "fixed bg-sand-50 w-16 h-16 flex rounded-xl shadow-md items-center justify-center z-50";
      clone.style.position = "fixed";
      clone.style.width = `${sourceRect.width}px`;
      clone.style.height = `${sourceRect.height}px`;
      clone.style.top = "0";
      clone.style.left = "0";
      clone.style.transform = `translate(${sourceRect.left}px, ${sourceRect.top}px)`;
      clone.style.opacity = "0.9";
      clone.style.pointerEvents = "none";
      clone.style.zIndex = "9999";
      clone.style.cursor = "grabbing";

      // Add logo image to clone
      const img = document.createElement("img");
      img.src = "/logo.png";
      img.alt = "MCP";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      clone.appendChild(img);

      // Add to document
      document.body.appendChild(clone);

      // Store reference to the clone
      cloneElementRef.current = clone;
    }

    return () => {
      // Clean up clone when dragging stops
      if (cloneElementRef.current) {
        document.body.removeChild(cloneElementRef.current);
        cloneElementRef.current = null;
      }
    };
  }, [isDragging]);

  // Handle success with delay
  const handleSuccess = () => {
    if (onDragSuccess) {
      // Delay the callback by 1 second to give users time to see the success state
      setTimeout(() => {
        onDragSuccess();
      }, 1000);
    }
  };

  // Check if two elements are overlapping
  const checkOverlap = (element1: DOMRect, element2: DOMRect): boolean => {
    // Make the target area larger for easier dropping
    const padding = 30;
    const expandedElement2 = {
      left: element2.left - padding,
      right: element2.right + padding,
      top: element2.top - padding,
      bottom: element2.bottom + padding,
    };

    // Check if the center of element1 is within the expanded bounds of element2
    const centerX = element1.left + element1.width / 2;
    const centerY = element1.top + element1.height / 2;

    return (
      centerX >= expandedElement2.left &&
      centerX <= expandedElement2.right &&
      centerY >= expandedElement2.top &&
      centerY <= expandedElement2.bottom
    );
  };

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isInstalled) return;

    e.preventDefault();

    const sourceRect = sourceRef.current?.getBoundingClientRect();
    if (!sourceRect) return;

    // Calculate offset of mouse within the source element
    const offsetX = e.clientX - sourceRect.left;
    const offsetY = e.clientY - sourceRect.top;

    // Start dragging
    setIsDragging(true);

    // Add cursor style to body
    document.body.style.cursor = "grabbing";

    // Handle mouse move
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      if (!cloneElementRef.current) return;

      // Update clone position
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      cloneElementRef.current.style.transform = `translate(${x}px, ${y}px)`;

      // Check if over target
      if (targetRef.current) {
        const targetRect = targetRef.current.getBoundingClientRect();
        const cloneRect = cloneElementRef.current.getBoundingClientRect();

        // Check for overlap
        const isOver = checkOverlap(cloneRect, targetRect);

        // Update both the state and the ref
        setIsOverTarget(isOver);
        isOverTargetRef.current = isOver;
      }
    };

    // Handle mouse up
    const handleMouseUp = () => {
      // Reset cursor
      document.body.style.cursor = "";

      // Use the ref value for immediate access
      const wasOverTarget = isOverTargetRef.current;

      // Handle successful drop
      if (wasOverTarget) {
        console.log("Drop successful!");
        setIsInstalled(true);

        // Call the success callback with delay
        handleSuccess();
      }

      // End dragging
      setIsDragging(false);
      setIsOverTarget(false);
      isOverTargetRef.current = false;

      // Remove event listeners
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    // Add event listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="flex gap-10 items-center">
      <BlurFade delay={3.6}>
        <div
          ref={sourceRef}
          className={`relative bg-sand-50 w-16 h-16 flex rounded-xl shadow-sm items-center justify-center ${isInstalled ? "opacity-0" : isDragging ? "cursor-grabbin scale-100 opacity-50" : "cursor-grab"}`}
          onMouseDown={!isInstalled ? handleMouseDown : undefined}
        >
          <img src="/logo.png" alt="MCP" />
        </div>
      </BlurFade>

      <BlurFade delay={3.7}>
        <svg
          width="184"
          height="56"
          viewBox="0 0 184 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`dark:text-sand-600 text-black w-10 h-10 transition-opacity duration-300 ${isInstalled ? "opacity-0" : "opacity-100"}`}
        >
          <path
            d="M141.492 22.0736C136.585 19.9234 131.371 17.7733 126.464 15.6231C121.25 13.4729 118.797 7.32923 121.25 2.41446C122.784 -0.657276 125.544 -0.350103 128.304 0.878591C138.732 5.48619 149.773 9.17227 159.894 14.7014C166.335 18.3875 173.389 20.2307 179.523 24.8383C185.35 29.1387 184.737 38.9682 177.989 42.0399C171.855 44.8045 165.415 47.2618 158.667 49.1049C153.147 50.6407 147.933 52.7909 142.719 54.6339C136.585 56.477 135.052 54.9411 134.438 48.4905C133.825 43.2685 137.199 41.1185 141.492 38.6611C136.279 36.818 131.985 38.3538 127.998 38.3538C116.343 38.661 104.689 39.5825 93.0344 39.8896C77.3929 40.1968 62.0583 42.6543 46.4168 44.1901C38.136 45.1117 29.8551 46.0332 21.5743 46.6475C17.2805 46.9547 12.9868 46.9546 8.69301 48.4905C4.70597 50.0263 1.33246 48.1834 0.412375 44.8045C-0.814408 39.8898 0.718959 35.5892 4.70601 34.6677C8.07966 33.7461 11.76 33.1319 15.4404 32.8247C34.4555 31.9032 53.1641 28.5242 72.4859 27.6027C89.6609 26.9884 106.529 25.4526 123.704 24.8383C129.531 24.5311 135.665 23.6095 141.492 22.9951C141.186 22.6879 141.186 22.3808 141.492 22.0736Z"
            fill="currentColor"
          />
        </svg>
      </BlurFade>

      <BlurFade delay={3.8}>
        <div
          ref={targetRef}
          className={`bg-sand-50 w-16 h-16 flex rounded-xl shadow-sm items-center justify-center transition-all duration-200 ${isOverTarget ? "bg-sand-200 scale-110" : ""} ${isInstalled ? "ring-2 ring-sand-400" : ""}`}
        >
          <img className="w-10 h-10" src="/claude.svg" alt="Claude" />
        </div>
      </BlurFade>
    </div>
  );
}
