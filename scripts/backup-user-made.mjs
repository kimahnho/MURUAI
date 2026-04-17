/**
 * user_made_n 테이블 전체 백업 스크립트.
 * canvas_data 포함 전체 데이터를 로컬 JSON 파일로 내보낸다.
 * 사용: node scripts/backup-user-made.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const SUPABASE_URL = "https://jfkkauxhrukfngboezoe.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impma2thdXhocnVrZm5nYm9lem9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTg0NjUsImV4cCI6MjA4MDU5NDQ2NX0.bacnOJZjY4Hlrv4o90cUpaVB-IkR0tQtKZFqNT6JgZM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PAGE_SIZE = 100;

async function backup() {
  console.log("🔄 user_made_n 백업 시작...");

  // 관리자 로그인 필요 — anon key로는 RLS 때문에 전체 조회 불가
  // 본인 데이터만 백업 가능하므로, 서비스 키가 필요하면 Supabase 대시보드에서 확인
  const allRows = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("user_made_n")
      .select("id,user_id,name,created_at,updated_at,canvas_data,deleted_at")
      .range(offset, offset + PAGE_SIZE - 1)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ 조회 실패:", error.message);
      // RLS 제한일 수 있음 — 로그인 없이는 본인 데이터만 가능
      if (offset === 0) {
        console.log("💡 anon key로는 RLS 때문에 전체 조회가 불가할 수 있습니다.");
        console.log("   Supabase 대시보드 > SQL Editor에서 아래 쿼리로 백업하세요:");
        console.log("   COPY (SELECT * FROM user_made_n) TO '/tmp/user_made_n_backup.csv' WITH CSV HEADER;");
      }
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allRows.push(...data);
    console.log(`  📦 ${allRows.length}개 로드됨...`);
    offset += PAGE_SIZE;

    if (data.length < PAGE_SIZE) {
      hasMore = false;
    }
  }

  if (allRows.length === 0) {
    console.log("⚠️  백업할 데이터가 없습니다.");
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `backup-user-made-${timestamp}.json`;
  const filepath = `scripts/${filename}`;

  writeFileSync(filepath, JSON.stringify(allRows, null, 2));

  const sizeMB = (Buffer.byteLength(JSON.stringify(allRows)) / 1024 / 1024).toFixed(1);
  console.log(`✅ 백업 완료: ${filepath}`);
  console.log(`   - ${allRows.length}개 문서, ${sizeMB}MB`);
}

backup().catch(console.error);
