import { Link } from "react-router";
import { ArrowRight, LineChart } from "lucide-react";
import { Button } from "../components/ui/button";
import { LiveProcessDemo } from "../components/landing/LiveProcessDemo";
import { WhatYouCanEvaluate } from "../components/landing/WhatYouCanEvaluate";
import { ScreenShowcase } from "../components/landing/ScreenShowcase";
import { ReportPreview } from "../components/landing/ReportPreview";
import "../styles/landing.css";

/**
 * 랜딩 페이지 — 섹션 컴포넌트(components/landing/)를 조립하는 얇은 페이지.
 */
export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAFA] text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LineChart className="h-4 w-4" />
            </div>
            <div>
              <p className="text-base font-semibold leading-none">
                ML Evaluation
              </p>
              <p className="text-xs text-muted-foreground">
                ISO/IEC 4213 based
              </p>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#process" className="hover:text-foreground">
              Process
            </a>
            <a href="#showcase" className="hover:text-foreground">
              Preview
            </a>
            <a href="#report" className="hover:text-foreground">
              Report
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto flex max-w-[1200px] flex-col justify-center gap-12 px-6 py-20">
          <div className="landing-fade-up mx-auto max-w-3xl text-center">
            <h1 className="mt-4 max-w-full text-3xl font-semibold leading-tight text-foreground sm:text-4xl md:text-6xl">
              Evaluate ML models from dataset to final report.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              ML Evaluation helps teams configure metrics, validate data, and
              produce a structured report through one guided workflow.
            </p>
            {/* 평가는 워크스페이스 안에서만 시작한다. 워크스페이스 없이 워크플로우로 바로
                들어가면 결과를 저장·발급·재조회할 수 없어(활성 워크스페이스가 없으면 run 이
                생성되지 않음) 진입로를 하나로 통합했다. */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/workspaces">
                  Create Workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="process" className="border-t border-border bg-card py-20">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="mx-auto mb-16 max-w-5xl text-center">
              <h2 className="text-3xl font-semibold leading-tight text-foreground md:text-5xl">
                See the full evaluation flow in motion.
              </h2>
            </div>
            <LiveProcessDemo />
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="mx-auto mb-16 max-w-5xl text-center">
              <h2 className="text-3xl font-semibold leading-tight text-foreground md:text-5xl">
                What you can evaluate
              </h2>
              <p className="mt-6 text-xl leading-8 text-primary md:text-2xl">
                Evaluate binary, multiclass, and multilabel classification models with the right metrics and data checks.
              </p>
            </div>
            <WhatYouCanEvaluate />
          </div>
        </section>

        <section id="showcase" className="py-24">
          <div className="mx-auto max-w-[1600px] px-6">
            <div className="mx-auto mb-20 max-w-5xl text-center">
              <h2 className="text-3xl font-semibold leading-tight text-foreground md:text-5xl">
                How you can evaluate
              </h2>
              <p className="mt-6 text-xl leading-8 text-primary md:text-2xl">
                Configure the model, choose metrics, upload datasets, and validate the data before generating the final report.
              </p>
            </div>
            <ScreenShowcase />
          </div>
        </section>

        <section id="report" className="border-y border-border bg-card py-24">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="mx-auto mb-16 max-w-5xl text-center">
              <h2 className="text-3xl font-semibold leading-tight text-foreground md:text-5xl">
                Generate the final report
              </h2>
              <p className="mt-6 text-xl leading-8 text-primary md:text-2xl">
                Results, criteria, data quality, and recommendations are
                organized in one report view.
              </p>
            </div>
            <ReportPreview />
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="text-3xl font-semibold">
              Start organizing model evaluations.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Create a workspace to run an evaluation and keep its report.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/workspaces">Create Workspace</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
