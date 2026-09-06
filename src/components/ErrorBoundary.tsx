/**
 * 렌더 중 예외를 잡아 안내 화면으로 바꾼다.
 *
 * ISSUES.md E-12 — 앱 전체에 ErrorBoundary 가 없어, 렌더 중 예외가 나면 React 가
 * 트리를 통째로 언마운트해 **안내 없는 백지**가 된다. 되돌아갈 링크조차 없고,
 * 이때 비영속 워크플로우 상태(E-01)까지 함께 날아간다.
 *
 * 실제로 그런 예외가 존재한다 — 워크스페이스 스냅샷을 복원해 재실행하면
 * `basicInfo.contractDate` 가 JSON 왕복 후 문자열이 되어 `formatDate` 가
 * `TypeError: d.getFullYear is not a function` 을 던진다(재현 확인).
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 서버 로그가 없으므로 최소한 브라우저 콘솔에는 원인이 남아야 한다.
    console.error("렌더 중 예외로 화면을 복구했습니다:", error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-lg font-semibold text-slate-800">화면을 표시하지 못했습니다</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          예기치 못한 오류가 발생했습니다. 아래 정보를 확인하고 다시 시도해 주세요.
        </p>
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs text-slate-600">
          {error.message}
        </pre>
        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          진행 중이던 입력이 남아 있지 않을 수 있습니다. 워크스페이스에서 평가를 다시 시작해 주세요.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            다시 시도
          </button>
          <a
            href="/workspaces"
            className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            워크스페이스로 이동
          </a>
        </div>
      </div>
    );
  }
}
