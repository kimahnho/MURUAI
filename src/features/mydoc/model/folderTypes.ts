/** 폴더 DB 레코드 */
export interface FolderRow {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** 폴더 트리 노드 (하위폴더 포함) */
export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  color: string | null;
  sortOrder: number;
  docCount: number;
  children: FolderNode[];
}

/** 폴더 생성/수정 입력 */
export interface FolderInput {
  name: string;
  parentId?: string | null;
  color?: string | null;
}
