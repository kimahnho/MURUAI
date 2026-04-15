/**
 * 폴더 CRUD + 문서 이동 API.
 * Supabase 직접 호출. 소프트 삭제 패턴 준수.
 */
import { supabase } from "@/shared/api/supabase";

import type { FolderInput, FolderNode, FolderRow } from "../model/folderTypes";

// 폴더 목록 조회 (트리 구조로 변환)
export const fetchFolderTree = async (
  userId: string,
): Promise<FolderNode[]> => {
  const [foldersResult, countsResult] = await Promise.all([
    supabase
      .from("document_folders")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.rpc("get_folder_document_counts", { p_user_id: userId }),
  ]);

  if (foldersResult.error) throw foldersResult.error;

  const folders = foldersResult.data as FolderRow[];
  const countMap = new Map<string, number>();
  if (countsResult.data) {
    for (const row of countsResult.data as {
      folder_id: string;
      doc_count: number;
    }[]) {
      countMap.set(row.folder_id, Number(row.doc_count));
    }
  }

  return buildTree(folders, countMap);
};

// 플랫 목록 → 2단계 트리
const buildTree = (
  folders: FolderRow[],
  countMap: Map<string, number>,
): FolderNode[] => {
  const nodeMap = new Map<string, FolderNode>();

  for (const f of folders) {
    nodeMap.set(f.id, {
      id: f.id,
      name: f.name,
      parentId: f.parent_id,
      color: f.color,
      sortOrder: f.sort_order,
      docCount: countMap.get(f.id) ?? 0,
      children: [],
    });
  }

  const roots: FolderNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
};

// 폴더 생성
export const createFolder = async (
  userId: string,
  input: FolderInput,
): Promise<FolderRow> => {
  const { data, error } = await supabase
    .from("document_folders")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      parent_id: input.parentId ?? null,
      color: input.color ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FolderRow;
};

// 폴더 이름 변경
export const renameFolder = async (
  folderId: string,
  name: string,
): Promise<void> => {
  const { error } = await supabase
    .from("document_folders")
    .update({ name: name.trim() })
    .eq("id", folderId);

  if (error) throw error;
};

// 폴더 삭제 (하위폴더 + 문서 정리 포함)
export const deleteFolder = async (
  folderId: string,
  userId: string,
): Promise<void> => {
  const now = new Date().toISOString();

  // 1. 하위폴더 조회
  const { data: subfolders } = await supabase
    .from("document_folders")
    .select("id")
    .eq("parent_id", folderId)
    .eq("user_id", userId)
    .is("deleted_at", null);

  const allFolderIds = [
    folderId,
    ...(subfolders?.map((f: { id: string }) => f.id) ?? []),
  ];

  // 2. 모든 관련 문서의 folder_id를 NULL로 (미분류 이동)
  await supabase
    .from("user_made_n")
    .update({ folder_id: null })
    .in("folder_id", allFolderIds)
    .eq("user_id", userId);

  // 3. 하위폴더 소프트 삭제
  if (subfolders && subfolders.length > 0) {
    await supabase
      .from("document_folders")
      .update({ deleted_at: now })
      .in(
        "id",
        subfolders.map((f: { id: string }) => f.id),
      );
  }

  // 4. 상위폴더 소프트 삭제
  await supabase
    .from("document_folders")
    .update({ deleted_at: now })
    .eq("id", folderId);
};

// 문서를 폴더로 이동 (폴더 존재+미삭제 확인 포함)
export const moveDocumentToFolder = async (
  docId: string,
  folderId: string | null,
  userId: string,
): Promise<boolean> => {
  if (folderId === null) {
    // 미분류로 이동
    const { error } = await supabase
      .from("user_made_n")
      .update({ folder_id: null })
      .eq("id", docId)
      .eq("user_id", userId);
    return !error;
  }

  // 폴더 존재 + 미삭제 확인 후 이동
  const { data: folder } = await supabase
    .from("document_folders")
    .select("id")
    .eq("id", folderId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (!folder) return false;

  const { error } = await supabase
    .from("user_made_n")
    .update({ folder_id: folderId })
    .eq("id", docId)
    .eq("user_id", userId);

  return !error;
};

// 여러 문서를 한 번에 폴더로 이동 (50건씩 배치, 결과 검증)
export const moveDocumentsToFolder = async (
  docIds: string[],
  folderId: string | null,
  userId: string,
): Promise<boolean> => {
  const BATCH_SIZE = 50;

  for (let i = 0; i < docIds.length; i += BATCH_SIZE) {
    const batch = docIds.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("user_made_n")
      .update({ folder_id: folderId })
      .in("id", batch)
      .eq("user_id", userId);

    if (error) return false;
  }
  return true;
};

// 미분류 문서 개수 조회
export const fetchUnfiledDocCount = async (
  userId: string,
): Promise<number> => {
  const { count, error } = await supabase
    .from("user_made_n")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("folder_id", null)
    .is("deleted_at", null);

  if (error) return 0;
  return count ?? 0;
};
