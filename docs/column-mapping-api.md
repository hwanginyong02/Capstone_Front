# Column Mapping API Contract

This document describes the minimum backend data the frontend needs for the column mapping step.

## Current status

- The current frontend screen uses mock data.
- The mock data is defined in `src/components/home/ColumnMapping.tsx`.
- The UI structure is implemented, but the real API is not connected yet.

## Frontend request

The frontend sends the following data when entering the column mapping step:

```json
{
  "fileId": "file_123",
  "taskType": "binary",
  "selectedTcIds": ["TC2", "TC3", "TC19"]
}
```

### Fields

- `fileId`: identifier of the uploaded file
- `taskType`: one of `binary`, `multiclass`, `multilabel`
- `selectedTcIds`: selected test case IDs

## Backend response

The backend should return only the data needed to render the review UI.

```json
{
  "requiredRoles": ["id", "y_true", "y_pred", "score"],
  "tcRequirements": [
    {
      "tcId": "TC2",
      "tcName": "Precision",
      "requiredRoles": ["id", "y_true", "y_pred"]
    },
    {
      "tcId": "TC3",
      "tcName": "Recall",
      "requiredRoles": ["id", "y_true", "y_pred"]
    },
    {
      "tcId": "TC19",
      "tcName": "Log Loss",
      "requiredRoles": ["id", "y_true", "score"]
    }
  ],
  "rows": [
    {
      "originalName": "row_id",
      "sampleValues": ["S001", "S002", "S003"],
      "inferredRole": "id",
      "warnings": []
    },
    {
      "originalName": "actual_result",
      "sampleValues": ["1", "0", "1"],
      "inferredRole": "y_true",
      "warnings": []
    },
    {
      "originalName": "positive_score",
      "sampleValues": ["0.92", "0.67", "0.88"],
      "inferredRole": "score",
      "warnings": ["Please review this mapping. The column may contain score or probability values."]
    },
    {
      "originalName": "comment",
      "sampleValues": ["pass", "review", "retry"],
      "inferredRole": "ignore",
      "warnings": []
    }
  ]
}
```

## Response fields

### `requiredRoles`

Roles required across the full evaluation based on `taskType` and `selectedTcIds`.

### `tcRequirements`

Per-test-case requirement summary used in the upper section of the UI.

- `tcId`: test case ID
- `tcName`: display name
- `requiredRoles`: roles required by that test case

### `rows`

Detected uploaded columns and backend auto-mapping results.

- `originalName`: original uploaded column name
- `sampleValues`: 3 to 5 sample values for quick inspection
- `inferredRole`: backend auto-mapped role
- `warnings`: review messages for ambiguous or risky mappings

## Allowed role values

- `id`
- `y_true`
- `y_pred`
- `score`
- `prob_class_*`
- `true_labels`
- `pred_labels`
- `prob_label_*`
- `ignore`
- `null`

## Final mapping submission

After the user reviews and edits the mapping, the frontend sends the confirmed result back to the backend.

```json
{
  "fileId": "file_123",
  "mappings": [
    { "originalName": "row_id", "finalRole": "id" },
    { "originalName": "actual_result", "finalRole": "y_true" },
    { "originalName": "predicted_result", "finalRole": "y_pred" },
    { "originalName": "positive_score", "finalRole": "score" },
    { "originalName": "comment", "finalRole": "ignore" }
  ]
}
```

## What is intentionally excluded

The frontend does not need these fields for the current UI:

- confidence score
- candidate role percentages
- extra summary counters from the backend

Warnings are enough for review hints.
