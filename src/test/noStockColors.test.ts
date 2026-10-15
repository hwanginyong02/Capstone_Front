/**
 * 앱 화면에 stock 색이 다시 들어오지 않게 막는다(docs/MATERIAL_PICKER.md §10).
 *
 * 색은 `styles/theme.css` 의 토큰(`bg-primary`·`text-muted-foreground`·`border-border-strong`·
 * `text-destructive`·`bg-warning-subtle` 등)으로만 쓴다. `bg-blue-50` 이나 `#FAFAFA` 처럼
 * 값을 직접 적으면 디자인 시스템을 바꿀 때 그 자리만 옛 색으로 남는다.
 *
 * 성적서 렌더링(`components/report`)과 랜딩(`components/landing`, `pages/LandingPage.tsx`)은
 * 범위 밖이다 — 성적서는 인쇄되는 문서이고 랜딩은 마케팅 화면이라 따로 다룬다.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const SRC = resolve(__dirname, "..");

const EXCLUDED = [/^components\/report\//, /^components\/landing\//, /^pages\/LandingPage\.tsx$/];

const STOCK_COLOR =
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|divide|placeholder|decoration|shadow|accent|caret)(?:-[trblxy])?-(?:slate|gray|zinc|neutral|stone|red|rose|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink)-\d{2,3}\b/;
const HEX_COLOR = /#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b/;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) return [];
    return [path];
  });
}

function findViolations(): string[] {
  return listSourceFiles(SRC).flatMap((path) => {
    const rel = relative(SRC, path).replace(/\\/g, "/");
    if (EXCLUDED.some((pattern) => pattern.test(rel))) return [];
    return readFileSync(path, "utf-8")
      .split(/\r?\n/)
      .flatMap((line, index) =>
        STOCK_COLOR.test(line) || HEX_COLOR.test(line) ? [`${rel}:${index + 1}: ${line.trim()}`] : [],
      );
  });
}

describe("앱 화면의 색", () => {
  it("stock 색 클래스와 hex 값 대신 디자인 토큰을 쓴다", () => {
    expect(findViolations()).toEqual([]);
  });
});
