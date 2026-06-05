import { DasBrandLink } from "@/components/brand/das-brand-link";

export function DasAppFooter() {
  return (
    <footer className="das-app-footer mt-auto border-t border-border/60 px-4 py-5 md:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-text-tertiary">
          İş Takibi — hukuk bürosu operasyon platformu
        </p>
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          <span>Geliştiren</span>
          <DasBrandLink variant="wordmark" className="text-xs" />
        </div>
      </div>
    </footer>
  );
}
