import Image from "next/image";

interface BahandiLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark"; // kept for API compatibility
  className?: string;
}

const HEIGHTS: Record<NonNullable<BahandiLogoProps["size"]>, number> = {
  sm: 32,
  md: 40,
  lg: 56,
};

export function BahandiLogo({ size = "md", className = "" }: BahandiLogoProps) {
  const h = HEIGHTS[size];
  return (
    <Image
      src="/bahandi-logo-removebg-preview.png"
      alt="Bahandi Burger"
      height={h}
      width={h * 5}
      style={{ height: h, width: "auto" }}
      className={`object-contain ${className}`}
      priority
    />
  );
}
