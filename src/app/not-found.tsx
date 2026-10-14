import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-brand max-w-md py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-3xl font-extrabold">This page found a new home</h1>
      <p className="mt-2 text-sm text-[#69736D]">The page you want no longer exists.</p>
      <Link href="/" className="btn-primary mt-6">Back to home</Link>
    </div>
  );
}
