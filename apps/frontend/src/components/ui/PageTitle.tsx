interface PageTitleProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageTitle({ title, subtitle, actions }: PageTitleProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1
          className="text-2xl sm:text-4xl font-bold text-[#2a1f14]"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {title}
        </h1>
        {subtitle && <p className="text-sm sm:text-base text-[#6b5a4a] mt-1 sm:mt-2">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
