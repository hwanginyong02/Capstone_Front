# 프론트엔드 개발 가이드라인 및 아키텍처 규칙 (Frontend Development Guideline)

이 문서는 최근 리팩토링을 통해 확립된 프로젝트의 아키텍처 원칙과 개발 시 반드시 지켜야 할 규칙들을 설명합니다. **새로운 팀원이 프로젝트에 참여하거나 새로운 기능을 개발할 때, 이 구조가 무너지지 않도록 아래 규칙들을 엄격하게 준수해야 합니다.**

---

## 1. 페이지 조립자 패턴 (Page as Assembler Pattern)

**`src/pages/` 내부의 파일들은 오직 "조립(Assemble)" 역할만 수행합니다.**

*   **규칙 1**: 페이지 파일 내부에 복잡한 JSX 구조(예: 수많은 `<div>` 중첩, 인라인 스타일링 등)나 세부적인 UI 렌더링 로직을 직접 작성하지 마세요.
*   **규칙 2**: 화면을 구성하는 실제 컨텐츠와 비즈니스 로직은 반드시 `src/components/<도메인>/` 하위에 별도 컴포넌트로 분리한 뒤, 페이지 파일에서는 이를 불러와 배치만 해야 합니다.
*   **규칙 3**: 페이지 파일은 Zustand 스토어(`useWorkflowStore`)에서 상태를 읽어와 자식 컴포넌트(Domain Component)에 주입(Props)하고, 이벤트를 처리하는 얇은 컨트롤러 역할만 담당합니다.

---

## 2. 레이아웃 오케스트레이션 (Layout Orchestration)

**공통 레이아웃 컴포넌트(`ActionBar`, `AppHeader` 등)는 도메인 컴포넌트 내부에 하드코딩될 수 없습니다.**

*   **규칙 1**: `src/components/` 하위의 화면 컴포넌트(`BasicInfo`, `TestItems`, `DataUpload` 등)는 오로지 **메인 컨텐츠 영역만 순수하게 렌더링(Pure Content Component)** 해야 합니다. 하단 다음/이전 버튼(`ActionBar`)을 컴포넌트 내부에 포함시키지 마세요.
*   **규칙 2**: 모든 공통 레이아웃과 화면의 뼈대는 `src/layout/WorkflowShell.tsx`가 전담합니다.
*   **규칙 3**: 하단 바의 다음 버튼 활성화 여부(`nextDisabled`)나 진행 이벤트(`onNext`)는 화면 컴포넌트 내부에 숨겨두지 말고, 상위 페이지(`pages/*.tsx`)로 상태를 끌어올린(Lifting State) 뒤 `WorkflowShell`의 Props로 전달해야 합니다.
    *   *예시: 도메인 컴포넌트는 `onValidationChange={(isValid) => setIsValid(isValid)}` 형태의 콜백을 통해 페이지에 상태를 보고하고, 페이지는 `<WorkflowShell nextDisabled={!isValid}>`로 레이아웃을 제어합니다.*

---

## 3. UI와 도메인 컴포넌트의 엄격한 분리

**`src/components/ui/` 폴더는 재사용 가능한 '원시(Primitive) 컴포넌트'의 성역입니다.**

*   **규칙 1**: `button`, `input`, `card`, `badge` 등 애플리케이션 전반에서 공통으로 재사용되는 컴포넌트만 `components/ui/`에 위치할 수 있습니다.
*   **규칙 2**: 특정 페이지나 화면(예: Metric Detail, Data Validation)에서만 단발성으로 쓰이는 컴포넌트들을 `ui/` 폴더에 몰아넣지 마세요. 이들은 반드시 `src/components/<해당도메인>/` 폴더 내부로 코로케이션(Colocation) 되어야 합니다.

---

## 4. 유틸리티(Utils) 및 글로벌 상태(Stores)의 계층적 관리

**`src/utils/` 디렉토리는 목적과 도메인에 따라 명확하게 계층화되어 관리됩니다.**

*   **규칙 1 (구조화)**: 파일들을 루트에 늘어놓지 마세요. 아래와 같은 체계를 유지합니다.
    *   `src/utils/styling/`: Tailwind CSS 병합 등 스타일링 유틸리티 (`styles.ts`)
    *   `src/utils/format/`: 데이터 포맷팅 유틸리티 (`format.ts`)
    *   `src/utils/domain/`: 비즈니스/도메인 로직 유틸리티 (`validation.ts`, `mappingHelpers.ts`)
    *   `src/utils/stores/`: 전역 상태 관리 (`useWorkflowStore.ts`)
*   **규칙 2 (문서화)**: 모든 유틸리티 및 스토어 파일의 최상단에는 해당 모듈이 어떤 역할을 하는지, 주로 어디서 사용되는지를 설명하는 **한국어 JSDoc 주석**을 반드시 작성해야 합니다.

---

## 5. 레이아웃 내부 구성요소의 분리

*   **규칙 1**: `src/layout/`의 최상위에는 외부(Pages)로 노출되는 가장 중요한 래퍼(Wrapper)인 `WorkflowShell.tsx`만 남겨둡니다.
*   **규칙 2**: 레이아웃을 구성하는 내부 부품(`AppHeader.tsx`, `ActionBar.tsx`, `StepTabs.tsx`)은 `src/layout/components/` 디렉토리 내부에 분리하여 은닉성(Encapsulation)을 유지합니다.

---

## ✅ 요약: "어떻게 개발해야 하나요?"

1.  **새로운 페이지를 만들 때**: `src/pages/`에 뼈대(조립자)를 만들고, `<WorkflowShell>`로 전체를 감쌉니다.
2.  **새로운 UI 요소를 만들 때**: 범용적이면 `src/components/ui/`에, 특정 화면 전용이면 `src/components/<도메인>/`에 만듭니다.
3.  **다음 단계 버튼이나 레이아웃을 제어할 때**: 자식 컴포넌트 내부에 버튼을 달지 말고, 상태를 페이지 파일로 넘긴 후 페이지 파일에서 `WorkflowShell`에 설정을 넘겨 제어합니다.
4.  **새로운 유틸리티나 스토어를 만들 때**: `src/utils/` 내부의 목적에 맞는 하위 폴더에 넣고, 상단에 한글 주석을 남깁니다.
