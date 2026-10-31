import { Coffee } from "lucide-react";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-full bg-crema text-white">
        <Coffee className="size-4" aria-hidden />
      </span>
      <span className="whitespace-nowrap font-display text-base font-semibold tracking-tight text-espresso sm:text-lg">
        {APP_NAME}
      </span>
    </Link>
  );
}
