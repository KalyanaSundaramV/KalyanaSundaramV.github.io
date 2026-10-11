import { useEffect, useMemo, useRef } from "react";
import { Check, ExternalLink, X } from "lucide-react";
import {
  PortfolioArtwork,
  ProjectArtwork,
} from "@/components/art/PortfolioArtwork";
import { createDetailViewModel, type ActiveDetail } from "@/lib/detail";

type DetailDialogProps = {
  activeDetail: ActiveDetail | null;
  onClose: () => void;
};

export function DetailDialog({ activeDetail, onClose }: DetailDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const model = useMemo(
    () => (activeDetail ? createDetailViewModel(activeDetail) : null),
    [activeDetail],
  );

  useEffect(() => {
    if (!activeDetail) return;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [activeDetail]);

  useEffect(() => {
    if (!activeDetail) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeDetail]);

  useEffect(() => {
    if (!activeDetail) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeDetail, onClose]);

  if (!activeDetail || !model) return null;

  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="case-study-modal"
      data-open="true"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="case-study-dialog"
        data-kind={activeDetail.kind}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-dialog-title"
        aria-describedby="detail-dialog-summary"
        onKeyDown={trapFocus}
      >
        <div className="case-study-head" data-detail-reveal="header">
          <div>
            <span>{model.eyebrow}</span>
            <h2 id="detail-dialog-title">{model.title}</h2>
            <p id="detail-dialog-summary">{model.summary}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close details"
          >
            <X />
          </button>
        </div>

        {activeDetail.kind === "project" ? (
          <div className="case-study-scroll-region">
            <div className="case-study-content">
              <ProjectArtwork project={activeDetail.item} />
              <div className="case-study-intro" data-detail-reveal="intro">
                <p>{activeDetail.item.longSummary}</p>
                {activeDetail.item.notice ? (
                  <aside>{activeDetail.item.notice}</aside>
                ) : null}
                <div className="metric-grid">
                  {activeDetail.item.metrics.map((metric) => (
                    <span key={metric.label}>
                      <small>{metric.label}</small>
                      <strong>{metric.value}</strong>
                    </span>
                  ))}
                </div>
              </div>
              <div className="case-study-sections">
                {activeDetail.item.caseStudySections.map((section, index) => (
                  <article
                    key={`${section.kicker}-${section.title}`}
                    data-detail-reveal="section"
                    style={{ "--detail-index": index } as React.CSSProperties}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <small>{section.kicker}</small>
                      <h3>{section.title}</h3>
                      <p>{section.body}</p>
                    </div>
                  </article>
                ))}
              </div>
              <aside className="case-study-sidebar" data-detail-reveal="rail">
                <PortfolioArtwork
                  variant={model.artwork}
                  label={activeDetail.item.type}
                />
                <h3>Systems and responsibilities</h3>
                {activeDetail.item.toolCategories.map((category) => (
                  <span key={category}>
                    <Check /> {category}
                  </span>
                ))}
                {activeDetail.item.links.some((link) => link.href) ? (
                  <h3>Links</h3>
                ) : null}
                {activeDetail.item.links.map((link) =>
                  link.href ? (
                    <a href={link.href} key={link.label}>
                      {link.label}
                      <ExternalLink />
                    </a>
                  ) : null,
                )}
              </aside>
              {activeDetail.item.media.some((item) => item.type === "image") ? (
                <div className="media-placeholders">
                  {activeDetail.item.media.map((item) =>
                    item.type === "image" ? (
                      <div key={item.label}>
                        <img src={item.src} alt={item.alt} />
                        <span>{item.label}</span>
                      </div>
                    ) : null,
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="detail-scroll-region">
            <div className="detail-content">
              <div className="detail-main">
                <p className="detail-summary" data-detail-reveal="intro">
                  {model.summary}
                </p>
                {model.sections.map((section, index) => (
                  <article
                    key={section.label}
                    data-detail-reveal="section"
                    style={{ "--detail-index": index } as React.CSSProperties}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <small>{section.label}</small>
                      <h3>{section.title}</h3>
                      <p>{section.body}</p>
                    </div>
                  </article>
                ))}
              </div>
              <aside className="detail-sidebar" data-detail-reveal="rail">
                <PortfolioArtwork
                  variant={model.artwork}
                  label={model.eyebrow}
                />
                <div className="detail-scope">
                  <small>Scope</small>
                  <p>{model.detail.scope}</p>
                </div>
                <div className="detail-facts">
                  {model.facts.slice(1).map((fact) => (
                    <span key={fact.label}>
                      <small>{fact.label}</small>
                      <strong>{fact.value}</strong>
                    </span>
                  ))}
                </div>
                <div className="detail-rail-section">
                  <h3>Engineering evidence</h3>
                  <ul className="detail-proof-list">
                    {model.detail.proofPoints.map((point) => (
                      <li key={point}>
                        <Check /> <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <details className="detail-disclosure-group">
                  <summary>Constraints and disclosure</summary>
                  <ul>
                    {model.detail.constraints.map((constraint) => (
                      <li key={constraint}>{constraint}</li>
                    ))}
                  </ul>
                  {model.detail.disclosure ? (
                    <p>{model.detail.disclosure}</p>
                  ) : null}
                </details>
                <div className="detail-rail-section">
                  <h3>Technologies</h3>
                  <div className="detail-tags">
                    {model.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                {model.evidence ? (
                  <div className="detail-evidence">
                    <PortfolioArtwork
                      variant={model.artwork}
                      label={model.evidence.label}
                      compact
                    />
                    <small>{model.evidence.label}</small>
                    <strong>{model.evidence.title}</strong>
                    <p>{model.evidence.body}</p>
                  </div>
                ) : null}
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
