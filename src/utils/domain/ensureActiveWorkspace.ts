import { useWorkspaceStore } from "../stores/useWorkspaceStore";
import { toIsoDate } from "./isoDate";

/**
 * 활성 워크스페이스를 보장한다 — 없으면 하나 만든다 (ISSUES.md E-02).
 *
 * 종전에는 워크스페이스 없이 워크플로우를 완주할 수 있었고, 6단계에서 계산한 성적서를
 * **버린 채** `/report/preview` 로 갔다. 그 화면의 성적서는 어디에도 저장되지 않아
 * 발급·재조회가 전부 불가능했다.
 *
 * **'평가 실행' 순간에만 만든다.** 워크플로우 진입 시점에 만들면 `/app/basic-info` 를
 * 열었다 나가기만 해도 빈 워크스페이스가 하나씩 쌓인다. 여기서 만들면 정확히 필요한
 * 순간에 하나만 생긴다.
 *
 * **시연 모드는 여기 도달하지 않는다.** 랜딩 iframe 은 `WorkflowShell` 의 showcase
 * early return 에 먼저 걸리고, showcase 에서는 ActionBar 자체가 렌더되지 않아
 * '다음' 핸들러가 발화할 수 없다(두 겹).
 */
export function ensureActiveWorkspace(modelName: string): string {
  const store = useWorkspaceStore.getState();
  if (store.activeWorkspaceId) return store.activeWorkspaceId;

  const name = modelName.trim() || `평가 ${toIsoDate(new Date())}`;
  return store.createWorkspace({
    name,
    // 사용자가 직접 만든 것과 구분할 수 있어야 나중에 정리할 수 있다.
    description: "평가를 실행할 때 자동으로 생성된 워크스페이스입니다.",
  }).id;
}
