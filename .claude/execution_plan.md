# Edit Page Memory Optimization Execution Plan

**Goal**
Reduce RAM usage for large page counts by optimizing thumbnails, PDF preview rendering, and undo history depth.

**Scope**
Update editor UI and history behavior only. No API contract changes outside the app.

**Steps**
1. Virtualize page thumbnails in `src/features/editor/components/BottomBar.tsx`.
2. Render `PdfPreviewContainer` only on-demand during export.
3. Cap undo history depth to 50 entries in `src/features/editor/store/unifiedHistoryStore.ts`.
4. Validate behavior via manual scenarios listed below.

**Implementation Details**
1. BottomBar virtualization
   - Compute visible page index range from `listRef` scroll position and container width.
   - Render only visible items plus a small buffer.
   - Insert left/right spacers to preserve total scroll width.
2. On-demand PDF preview
   - Move `PdfPreviewContainer` out of `MainSection`.
   - In `DesignLayout`, add `isPdfPreviewActive`, `preparePdfPages`, `cleanupPdfPages`.
   - Pass `preparePdfPages` and `cleanupPdfPages` to `ExportModal`.
   - Call `preparePdfPages` before `generatePdfFromDomPages`.
   - Call `cleanupPdfPages` in `finally` after download attempt.
3. History cap
   - Introduce `MAX_HISTORY_ENTRIES = 50`.
   - Trim `past` when appending new history entries.

**Validation**
1. Create 50+ pages and scroll BottomBar.
2. Export PDF with all pages and selected pages.
3. Perform >50 edits and confirm undo/redo works with capped history.

