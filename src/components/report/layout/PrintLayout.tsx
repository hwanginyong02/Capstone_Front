interface PrintLayoutProps {
  children: React.ReactNode;
}

export function PrintLayout({ children }: PrintLayoutProps) {
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm; }
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .recharts-responsive-container {
            width: 100% !important;
            height: 260px !important;
            min-height: 260px !important;
          }
          .recharts-wrapper {
            width: 100% !important;
            height: 260px !important;
          }
          .recharts-surface {
            width: 100% !important;
            height: 100% !important;
          }
        }
      `}</style>
      <div className="bg-white px-[20mm] py-[15mm] text-slate-900">
        {children}
      </div>
    </>
  );
}
