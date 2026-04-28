import type { ReactNode } from "react";
import { Footer } from "./layout/Footer";
import { Navbar } from "./layout/Navbar";
import { Sidebar } from "./layout/Sidebar";

interface RootProps {
  children: ReactNode;
}

export function Root({ children }: RootProps) {
  return (
    <>
      <Navbar />
      <Sidebar />
      {children}
      <Footer />
    </>
  );
}
