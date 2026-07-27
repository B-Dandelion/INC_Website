type EventPosterProps = {
  asset: any;
  emptyText: string;
  alt: string;
  imageClassName?: string;
  emptyClassName?: string;
};

function normalized(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function isPdf(asset: any) {
  const mime = normalized(asset?.resources?.mime);
  const filename = normalized(asset?.resources?.original_filename);
  return mime === "application/pdf" || filename.endsWith(".pdf");
}

export default function EventPoster({
  asset,
  emptyText,
  alt,
  imageClassName,
  emptyClassName,
}: EventPosterProps) {
  const resource = asset?.resources;

  if (!resource?.id) {
    return (
      <div className={emptyClassName}>
        <div style={{ color: "#64748b", fontSize: 13 }}>{emptyText}</div>
      </div>
    );
  }

  const href = `/api/resources/go?id=${resource.id}`;
  const title = resource.title ?? resource.original_filename ?? alt;

  if (isPdf(asset)) {
    return (
      <div
        style={{
          minHeight: 180,
          display: "grid",
          placeItems: "center",
          alignContent: "center",
          gap: 12,
          padding: 18,
          textAlign: "center",
          border: "1px solid #eee",
          borderRadius: 14,
          background: "#fff",
        }}
      >
        <div style={{ fontWeight: 900 }}>{title}</div>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 14px",
            border: "1px solid #2563eb",
            borderRadius: 10,
            color: "#2563eb",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          PDF 포스터 열기
        </a>
      </div>
    );
  }

  return <img src={href} alt={title} className={imageClassName} />;
}
