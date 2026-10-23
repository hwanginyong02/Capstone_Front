/**
 * useWorkflowStore — 워크플로우 입력의 영속성.
 *
 * E-01 — 이 스토어에는 persist 가 없어 **새로고침 한 번으로 검증 앞 단계 입력이
 * 전부 사라진다.** 수십 분간 입력한 기업정보·모델정보·지표·매핑이 날아가고, 그것을
 * 알리는 신호는 검증 단계의 "업로드된 파일이 없습니다" 문구뿐이다. 탭은 여전히 활성으로
 * 보이고 'Save draft' 버튼은 무동작이라 오인까지 강화된다.
 *
 * 함께 다뤄야 하는 것들 — persist 를 붙이는 순간 **지금은 새로고침이 초기화 역할을 해서
 * 세션 안에 갇혀 있던 오염이 영속화된다**:
 *   E-08 `setTaskType` 이 completedSteps·학습 데이터 정보를 비우지 않는다
 *   E-05 `?showcase=1` 이 실제 store 에 가짜 기업정보를 주입한다
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  WORKFLOW_STORAGE_KEY,
  useWorkflowStore,
} from "./useWorkflowStore";
import { DEFAULT_BASIC_INFO } from "../../types/workflow.types";
import type { MappingRow } from "../../types/mapping.types";

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
    useWorkflowStore.getState().markStepIdCompleted("upload");

    // 새로고침을 흉내낸다 — 저장소 내용은 그대로, 메모리만 초기 상태.
    // (setState 자체가 persist 를 트리거해 저장소를 덮으므로 스냅샷을 되돌려 놓는다.)
    const saved = localStorage.getItem(WORKFLOW_STORAGE_KEY)!;
    useWorkflowStore.setState({ basicInfo: DEFAULT_BASIC_INFO, completedStepIds: [] });
    localStorage.setItem(WORKFLOW_STORAGE_KEY, saved);
    await useWorkflowStore.persist.rehydrate();

    expect(useWorkflowStore.getState().basicInfo.companyName).toBe("복원되어야 함");
    expect(useWorkflowStore.getState().completedStepIds).toContain("upload");
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
    (["upload", "metrics", "mapping", "validation"] as const).forEach((id) =>
      s.markStepIdCompleted(id),
    );
    expect(useWorkflowStore.getState().completedStepIds).toHaveLength(4);

    useWorkflowStore.getState().setTaskType("multiclass");

    expect(useWorkflowStore.getState().completedStepIds).toEqual([]);
  });

  it("학습 데이터 정보를 비운다 — 이전 평가의 표본 수가 새 성적서에 인쇄되지 않게", () => {
    // 학습 데이터는 ⑥ 카드가 받는다(종전의 Details 학습 데이터 폼, persist v10).
    useWorkflowStore.getState().setComposerTrainingData({
      trainingVolume: { entries: [{ key: "Validation", value: "9999" }] },
    });

    useWorkflowStore.getState().setTaskType("multiclass");

    expect(useWorkflowStore.getState().composerTrainingData).toEqual({});
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

describe("파일 재업로드 표시", () => {
  it("파일을 다시 올리면 재업로드 필요 표시가 사라진다", () => {
    // 재수화 직후의 상태 — 입력은 남았고 원본 파일만 없다.
    useWorkflowStore.setState({ needsFileReupload: true, rawFile: null });
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

describe("재료 선택 점검의 진행 기록(materialCheckAck) — persist 판을 올리지 않는 최상위 키", () => {
  const ack = { at: "2026-10-17T05:03:00.000Z", version: "1.0", warningIds: ["reporting:8"] };

  it("저장소에 남고, 작업 유형을 바꾸면 비운다", () => {
    useWorkflowStore.getState().setMaterialCheckAck(ack);
    expect(persistedState()!.materialCheckAck).toEqual(ack);

    useWorkflowStore.getState().setTaskType("multiclass");
    expect(useWorkflowStore.getState().materialCheckAck).toBeNull();
  });

  it("이 키가 없던 옛 저장분을 읽어도 null 로 남는다(이 키 때문에 판을 올리지 않음)", async () => {
    // 판 15 는 평가 흐름 만들기의 놓인 항목(필수 포함) 때문에 올렸다 — 이 키와 무관하다.
    const { WORKFLOW_PERSIST_VERSION } = await import("./useWorkflowStore");
    expect(WORKFLOW_PERSIST_VERSION).toBe(15);
    useWorkflowStore.getState().setMaterialCheckAck(ack);
    const raw = JSON.parse(localStorage.getItem(WORKFLOW_STORAGE_KEY)!);
    delete raw.state.materialCheckAck;
    useWorkflowStore.setState({ materialCheckAck: null });
    localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(raw));
    await useWorkflowStore.persist.rehydrate();
    expect(useWorkflowStore.getState().materialCheckAck).toBeNull();
  });
});

describe("persist v15 — 판 14 저장분을 다시 읽으면 놓인 항목이 채워진다", () => {
  it("rehydrate 가 이행을 돌려 필수 항목과 지연시간을 넣는다", async () => {
    localStorage.setItem(
      WORKFLOW_STORAGE_KEY,
      JSON.stringify({
        version: 14,
        state: {
          taskType: "binary",
          materialPicks: { clientInfo: ["contactExtra:website"], evalData: [] },
        },
      }),
    );
    await useWorkflowStore.persist.rehydrate();

    const { materialPicks } = useWorkflowStore.getState();
    expect(materialPicks.clientInfo).toEqual(["companyInfo", "reportPurpose", "contactExtra:website", "requestDate"]);
    expect(materialPicks.evalData).toContain("latencyColumn");
    // 키가 없던 잠긴 카드는 그대로 없다.
    expect(materialPicks.model).toBeUndefined();
  });
});

describe("매핑 불변식 — 평가 흐름에 놓지 않은 항목의 역할은 받지 않는다(docs/MATERIAL_PICKER.md §12.4)", () => {
  const analysed = (): MappingRow[] => [
    { originalName: "label", sampleValues: ["0", "1"], inferredRole: "y_true", confirmedRole: "y_true", modified: false, warnings: [] },
    { originalName: "pred", sampleValues: ["0", "1"], inferredRole: "y_pred", confirmedRole: "y_pred", modified: false, warnings: [] },
    { originalName: "latency_ms", sampleValues: ["12"], inferredRole: "latency", confirmedRole: "latency", modified: false, warnings: [] },
  ];
  const latencyRow = () => useWorkflowStore.getState().columnMapping.find((row) => row.originalName === "latency_ms")!;

  beforeEach(() => {
    useWorkflowStore.getState().setTaskType("binary");
  });

  it("분석 결과의 latency 는 지연시간을 놓지 않았으면 ignore 로 들어가고 맡아 둔다", () => {
    useWorkflowStore.getState().setMaterialPick("evalData", ["yTrueColumn", "predictionColumns"]);
    useWorkflowStore.getState().setColumnMapping(analysed());
    expect(latencyRow()).toMatchObject({ confirmedRole: "ignore", heldRole: "latency", inferredRole: "latency" });
    expect(useWorkflowStore.getState().columnMapping[0].confirmedRole).toBe("y_true");
  });

  it("함수 꼴 쓰기도 거른다", () => {
    useWorkflowStore.getState().setMaterialPick("evalData", []);
    useWorkflowStore.getState().setColumnMapping(() => analysed());
    expect(latencyRow().confirmedRole).toBe("ignore");
  });

  it("빼면 ignore, 다시 넣으면 돌아온다 — 바뀔 때마다 가용 지표를 비운다", () => {
    useWorkflowStore.getState().setMaterialPick("evalData", ["latencyColumn"]);
    useWorkflowStore.getState().setColumnMapping(analysed());
    expect(latencyRow().confirmedRole).toBe("latency");

    useWorkflowStore.setState({ availableMetricIds: ["M1"] });
    useWorkflowStore.getState().setMaterialPick("evalData", []);
    expect(latencyRow()).toMatchObject({ confirmedRole: "ignore", heldRole: "latency" });
    expect(useWorkflowStore.getState().availableMetricIds).toBeNull();

    useWorkflowStore.setState({ availableMetricIds: ["M1"] });
    useWorkflowStore.getState().setMaterialPick("evalData", ["latencyColumn"]);
    expect(latencyRow().confirmedRole).toBe("latency");
    expect(latencyRow().heldRole).toBeUndefined();
    expect(useWorkflowStore.getState().availableMetricIds).toBeNull();
  });

  it("매핑이 그대로면 가용 지표도 그대로 — 다른 블록·같은 결과의 evalData 쓰기", () => {
    useWorkflowStore.getState().setMaterialPick("evalData", ["latencyColumn"]);
    useWorkflowStore.getState().setColumnMapping(analysed());
    const before = useWorkflowStore.getState().columnMapping;
    useWorkflowStore.setState({ availableMetricIds: ["M1"] });

    useWorkflowStore.getState().setMaterialPick("trainingData", ["trainingDescription"]);
    useWorkflowStore.getState().setMaterialPick("evalData", ["latencyColumn", "sampleIdColumn"]);
    expect(useWorkflowStore.getState().columnMapping).toBe(before);
    expect(useWorkflowStore.getState().availableMetricIds).toEqual(["M1"]);

    // 같은 배열을 다시 써도 바뀐 것이 없다.
    useWorkflowStore.getState().setColumnMapping(before);
    expect(useWorkflowStore.getState().availableMetricIds).toEqual(["M1"]);
  });

  it("picks 가 {} 면(평가 흐름 이전·시연) 그대로 받는다", () => {
    expect(useWorkflowStore.getState().materialPicks).toEqual({});
    useWorkflowStore.getState().setColumnMapping(analysed());
    expect(latencyRow().confirmedRole).toBe("latency");
    expect(latencyRow().heldRole).toBeUndefined();
  });
});
