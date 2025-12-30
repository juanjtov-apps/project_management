interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  centered = true,
  className = ''
}: SectionHeaderProps) {
  return (
    <div className={`${centered ? 'text-center' : ''} ${className}`}>
      {eyebrow && (
        <p
          className="text-xs uppercase tracking-[0.2em] mb-4 font-medium"
          style={{ color: '#6B7280' }}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight"
        style={{ color: '#FFFFFF' }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className="text-lg md:text-xl mt-4 max-w-2xl leading-relaxed"
          style={{
            color: '#9CA3AF',
            margin: centered ? '1rem auto 0' : '1rem 0 0'
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
