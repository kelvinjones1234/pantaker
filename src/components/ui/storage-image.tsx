"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState, type ReactNode } from "react";

type StorageImageProps = Omit<ImageProps, "src" | "alt" | "onError"> & {
  src?: string | null;
  alt: string;
  fallback?: ReactNode;
};

export function StorageImage({
  src,
  alt,
  fallback = null,
  className,
  ...props
}: StorageImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return <>{fallback}</>;

  if (src.startsWith("data:")) {
    const dataClassName = props.fill
      ? `absolute inset-0 h-full w-full ${className ?? "object-cover"}`
      : (className ?? "h-full w-full object-cover");
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={dataClassName}
        decoding="async"
        loading={props.priority ? "eager" : "lazy"}
      />
    );
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
