// Mark the page as a client component
'use client';

import { useState, useEffect } from 'react';
import { ThemeProvider } from "next-themes";
// import FirstAidInspectionPreview from '@/components/first-aid-inspection-preview';
import FirstAidInspectionPreview from '../components/first-aid-inspection-preview';



export default function Home() {
  const [mounted, setMounted] = useState(false);

  // This ensures that the component is only mounted on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  // If not mounted, do not render the dashboard to avoid hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system">
      <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
          <FirstAidInspectionPreview />
        </main>
      </div>
    </ThemeProvider>
  );
}
