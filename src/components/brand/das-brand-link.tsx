import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils/cn";

export const DAS_SYSTEMS_URL = "https://dassystems.com.tr";

type DasBrandLinkProps = {
  variant?: "lockup" | "compact" | "wordmark";
  className?: string;
  markClassName?: string;
  newTab?: boolean;
};

export function DasBrandLink({
  variant = "lockup",
  className,
  markClassName,
  newTab = true,
}: DasBrandLinkProps) {
  const external = newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};

  if (variant === "wordmark") {
    return (
      <a
        href={DAS_SYSTEMS_URL}
        className={cn(
          "font-serif text-sm tracking-tight text-text-secondary transition-colors hover:text-text-primary",
          className,
        )}
        {...external}
      >
        DAS Systems
      </a>
    );
  }

  if (variant === "compact") {
    return (
      <a
        href={DAS_SYSTEMS_URL}
        className={cn(
          "inline-flex items-center gap-2 text-text-primary transition-opacity hover:opacity-85",
          className,
        )}
        {...external}
      >
        <BrandMark className={cn("h-5 w-auto", markClassName)} />
        <span className="hidden font-serif text-sm tracking-tight sm:inline">DAS Systems</span>
      </a>
    );
  }

  return (
    <a
      href={DAS_SYSTEMS_URL}
      className={cn(
        "inline-flex items-center gap-2.5 text-text-primary transition-opacity hover:opacity-90",
        className,
      )}
      {...external}
    >
      <BrandMark className={cn("h-7 w-auto md:h-8", markClassName)} />
      <span className="font-serif text-lg tracking-tight md:text-xl">DAS Systems</span>
    </a>
  );
}
