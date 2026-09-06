/**
 * useWorkflowStore — 워크플로우 입력의 영속성.
 *
 * ISSUES.md E-01 — 이 스토어에는 persist 가 없어 **새로고침 한 번으로 1~5단계 입력이
 * 전부 사라진다.** 수십 분간 입력한 기업정보·모델정보·지표·매핑이 날아가고, 그것을
 * 알리는 신호는 6단계의 "업로드된 파일이 없습니다" 문구뿐이다. 탭은 여전히 활성으로
 * 보이고 'Save draft' 버튼은 무동작이라 오인까지 강화된다.
 *
 * 함께 다뤄야 하는 것들 — persist 를 붙이는 순간 **지금은 새로고침이 초기화 역할을 해서
 * 세션 안에 갇혀 있던 오염이 영속화된다**:
 *   E-08 `setTaskType` 이 completedSteps·datasetInfo 를 비우지 않는다
 *   E-05 `?showcase=1` 이 실제 store 에 가짜 기업정보를 주입한다
 *   E-09 `loadWorkflowSnapshot` 이 rawFile=null 인데 completedSteps 를 [1..6] 으로 채운다
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  WORKFLOW_STORAGE_KEY,
  useWorkflowStore,
} from "./useWorkflowStore";
import { DEFAULT_BASIC_INFO, DEFAULT_DATASET_INFO } from "../../types/workflow.types";

/** persist 가 실제로 기록한 내용을 읽는다. */
function persistedState(): Record<string, unknown> | null {
  const raw = localStorage.getItem(WORKFLOW_STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw).state ?? null;
}

function resetAll() {
  localStorage.clear();
  useWorkflowStore.getState().resetWorkflow();
}

beforeEach(resetAll);

describe("입력 영속", () => {
  it("[E-01] 1~3단계 입력이 저장소에 남는다", () => {
    useWorkflowStore.getState().setBasicInfo({
      ...DEFAULT_BASIC_INFO,
      companyName: "테스트 주식회사",
      modelName: "MyModel",
    });
    useWorkflowStore.getState().setTaskType("binary");
    useWorkflowStore.getState().setSelectedMetricIds(["M1", "M23"]);

    const saved = persistedState();
    expect(saved).not.toBeNull();
    expect((saved!.basicInfo as { companyName: string }).companyName).toBe("테스트 주식회사");
    expect(saved!.taskType).toBe("binary");
    expect(saved!.selectedMetricIds).toEqual(["M1", "M23"]);
  });

  it("[E-01] 새로고침(재수화)해도 입력이 돌아온다", async () => {
    useWorkflowStore.getState().setBasicInfo({
      ...DEFAULT_BASIC_INFO,
      companyName: "복원되어야 함",
    });
    useWorkflowStore.getState().markStepCompleted(1);

    // 새로고침을 흉내낸다 — 저장소 내용은 그대로, 메모리만 초기 상태.
    // (setState 자체가 persist 를 트리거해 저장소를 덮으므로 스냅샷을 되돌려 놓는다.)
    const saved = localStorage.getItem(WORKFLOW_STORAGE_KEY)!;
    useWorkflowStore.setState({ basicInfo: DEFAULT_BASIC_INFO, completedSteps: [] });
    localStorage.setItem(WORKFLOW_STORAGE_KEY, saved);
    await useWorkflowStore.persist.rehydrate();

    expect(useWorkflowStore.getState().basicInfo.companyName).toBe("복원되어야 함");
    expect(useWorkflowStore.getState().completedSteps).toContain(1);
  });

  it("[E-01] rawFile 은 저장하지 않는다 — File 객체는 직렬화할 수 없다", () => {
    const file = new File(["a,b\n1,2"], "data.csv", { type: "text/csv" });
    useWorkflowStore.getState().setUploadedFile(
      { name: "data.csv", size: "8 B", type: "text/csv" },
      file,
    );

    const saved = persistedState()!;
    expect(saved.rawFile).toBeUndefined();
    // 파일 '메타'는 남는다 — 그래야 "파일이 있었는데 지금은 없다"를 감지해 안내할 수 있다.
    expect((saved.uploadedFile as { name: string }).name).toBe("data.csv");
  });

  it("[E-01] 재수화 후 uploadedFile 은 있는데 rawFile 이 없는 상태를 구분할 수 있다", async () => {
    const file = new File(["x"], "data.csv", { type: "text/csv" });
    useWorkflowStore.getState().setUploadedFile({ name: "data.csv", size: "1 B", type: "text/csv" }, file);

    const saved = localStorage.getItem(WORKFLOW_STORAGE_KEY)!;
    useWorkflowStore.setState({ uploadedFile: null, rawFile: null });
    localStorage.setItem(WORKFLOW_STORAGE_KEY, saved);
    await useWorkflowStore.persist.rehydrate();

    const s = useWorkflowStore.getState();
    expect(s.uploadedFile?.name).toBe("data.csv");
    expect(s.rawFile).toBeNull(); // 재업로드가 필요하다는 신호
  });

  it("[E-11] validationResult 는 저장하지 않는다 — 용량이 크고 재취득이 싸다", () => {
    useWorkflowStore.getState().setValidationResult({
      task_type: "binary",
      selected_metric_ids: [],
      execution_summary: [],
      validation_details: [],
      error_count: 0,
      warning_count: 0,
    } as never);

    expect(persistedState()!.validationResult).toBeUndefined();
  });
});

describe("[E-08] 작업 유형 변경", () => {
  it("완료 표시를 비운다 — 빈 상태로 뒤 단계에 점프하지 못하게", () => {
    const s = useWorkflowStore.getState();
    [1, 2, 3, 4].forEach((n) => s.markStepCompleted(n));
    expect(useWorkflowStore.getState().completedSteps).toHaveLength(4);

    useWorkflowStore.getState().setTaskType("multiclass");

    expect(useWorkflowStore.getState().completedSteps).toEqual([]);
  });

  it("데이터셋 정보를 비운다 — 이전 평가의 표본 수가 새 성적서에 인쇄되지 않게", () => {
    useWorkflowStore.getState().setDatasetInfo({
      ...DEFAULT_DATASET_INFO,
      validationSampleCount: "9999",
    });

    useWorkflowStore.getState().setTaskType("multiclass");

    expect(useWorkflowStore.getState().datasetInfo.validationSampleCount).toBe(
      DEFAULT_DATASET_INFO.validationSampleCount,
    );
  });

  it("기업정보(basicInfo)는 유지한다 — 작업 유형만 바꿨는데 1단계까지 날아가면 안 된다", () => {
    useWorkflowStore.getState().setBasicInfo({ ...DEFAULT_BASIC_INFO, companyName: "유지되어야 함" });

    useWorkflowStore.getState().setTaskType("multiclass");

    expect(useWorkflowStore.getState().basicInfo.companyName).toBe("유지되어야 함");
  });

  it("기존 동작 보존 — 지표·매핑·파일은 여전히 비운다", () => {
    const s = useWorkflowStore.getState();
    s.setSelectedMetricIds(["M1"]);
    s.setUploadedFile({ name: "f.csv", size: "1 B", type: "text/csv" }, new File(["x"], "f.csv"));

    useWorkflowStore.getState().setTaskType("multiclass");

    const after = useWorkflowStore.getState();
    expect(after.selectedMetricIds).toEqual([]);
    expect(after.uploadedFile).toBeNull();
    expect(after.rawFile).toBeNull();
  });
});

describe("[E-09] 과거 평가 스냅샷 복원", () => {
  const snapshot = {
    basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "과거 평가" },
    datasetInfo: DEFAULT_DATASET_INFO,
    taskType: "binary" as const,
    selectedMetricIds: ["M1"],
    metricDetails: {},
    uploadedFile: { name: "old.csv", size: "1 KB", type: "text/csv" },
    trainingExampleFiles: [],
    trainingUnsuitableExampleFiles: [],
    columnMapping: [],
    classLabelDescriptions: {},
  };

  it("파일이 없는 단계까지 '완료'로 표시하지 않는다", () => {
    useWorkflowStore.getState().loadWorkflowSnapshot(snapshot);

    const s = useWorkflowStore.getState();
    expect(s.rawFile).toBeNull();
    // 4단계(데이터 업로드) 이후는 파일이 있어야 성립한다 — 완료로 표시하면 거짓말이다.
    expect(s.completedSteps).not.toContain(4);
    expect(s.completedSteps).not.toContain(5);
    expect(s.completedSteps).not.toContain(6);
  });

  it("파일 재업로드가 필요하다는 사실을 상태로 남긴다", () => {
    useWorkflowStore.getState().loadWorkflowSnapshot(snapshot);

    expect(useWorkflowStore.getState().needsFileReupload).toBe(true);
  });

  it("파일을 다시 올리면 재업로드 필요 표시가 사라진다", () => {
    useWorkflowStore.getState().loadWorkflowSnapshot(snapshot);
    useWorkflowStore
      .getState()
      .setUploadedFile({ name: "new.csv", size: "1 B", type: "text/csv" }, new File(["x"], "new.csv"));

    expect(useWorkflowStore.getState().needsFileReupload).toBe(false);
  });
});

describe("[E-16] 현재 run 식별자", () => {
  it("방금 만든 run 의 id 를 보관한다 — 성적서로 돌아갈 경로가 생긴다", () => {
    useWorkflowStore.getState().setLastRunId("run-abc");

    expect(useWorkflowStore.getState().lastRunId).toBe("run-abc");
    expect(persistedState()!.lastRunId).toBe("run-abc");
  });

  it("초기 상태에는 없다", () => {
    expect(useWorkflowStore.getState().lastRunId).toBeNull();
  });
});

describe("[E-05] 시연 모드(?showcase=1)", () => {
  function enterShowcase() {
    window.history.replaceState({}, "", "/app/basic-info?showcase=1");
  }
  function leaveShowcase() {
    window.history.replaceState({}, "", "/app/basic-info");
  }

  it("시연 데이터가 저장소에 남지 않는다 — 가짜 사업자등록번호가 영속되면 안 된다", () => {
    enterShowcase();
    try {
      localStorage.clear(); // 시연 진입 시점의 저장소를 비운 뒤 시연 데이터를 주입한다
      useWorkflowStore.getState().setBasicInfo({
        ...DEFAULT_BASIC_INFO,
        companyName: "Apex AI Lab",
        businessNumber: "123-45-67890",
      });

      expect(localStorage.getItem(WORKFLOW_STORAGE_KEY)).toBeNull();
    } finally {
      leaveShowcase();
    }
  });

  it("시연 중에는 사용자의 실제 작업을 읽지 않는다 — 실제 데이터가 시연에 새어 나오면 안 된다", async () => {
    useWorkflowStore.getState().setBasicInfo({ ...DEFAULT_BASIC_INFO, companyName: "실제 고객사" });
    const saved = localStorage.getItem(WORKFLOW_STORAGE_KEY)!;

    enterShowcase();
    try {
      localStorage.setItem(WORKFLOW_STORAGE_KEY, saved);
      useWorkflowStore.setState({ basicInfo: DEFAULT_BASIC_INFO });
      await useWorkflowStore.persist.rehydrate();

      expect(useWorkflowStore.getState().basicInfo.companyName).not.toBe("실제 고객사");
    } finally {
      leaveShowcase();
    }
  });

  it("시연을 벗어나면 다시 정상적으로 저장한다", () => {
    enterShowcase();
    localStorage.clear();
    useWorkflowStore.getState().setBasicInfo({ ...DEFAULT_BASIC_INFO, companyName: "시연" });
    expect(localStorage.getItem(WORKFLOW_STORAGE_KEY)).toBeNull();

    leaveShowcase();
    useWorkflowStore.getState().setBasicInfo({ ...DEFAULT_BASIC_INFO, companyName: "실제" });
    expect(persistedState()).not.toBeNull();
    expect((persistedState()!.basicInfo as { companyName: string }).companyName).toBe("실제");
  });
});
