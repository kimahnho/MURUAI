/**
 * 개인정보 처리방침 페이지.
 * Footer "개인정보 처리방침" 링크에서 진입.
 */
const PrivacyPage = () => {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
      <h1 className="text-headline-28-bold text-black-90 mb-4">
        개인정보 처리방침
      </h1>
      <p className="text-14-regular text-black-50 mb-12">
        시행일: 2026년 ○월 ○일
      </p>

      <p className="text-15-regular text-black-70 mb-10 leading-relaxed">
        주식회사 무루(이하 &quot;회사&quot;)는 「개인정보 보호법」 제30조에 따라
        정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게
        처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립,
        공개합니다.
      </p>

      {/* 제1조 */}
      <Article title="제1조 (개인정보의 처리 목적)">
        <p>
          회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는
          개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이
          변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를
          받는 등 필요한 조치를 이행할 예정입니다.
        </p>
        <ol>
          <li>
            <strong>회원가입 및 관리</strong>: 회원 식별, 가입 의사 확인,
            본인 확인, 회원자격 유지 및 관리, 서비스 부정 이용 방지, 각종 고지
            및 통지
          </li>
          <li>
            <strong>서비스 제공</strong>: 교육 자료 제작, AI 콘텐츠 생성,
            학습자 관리, 자료 저장 및 편집, 자료 마켓 운영, PDF 출력 및
            다운로드
          </li>
          <li>
            <strong>유료 서비스 및 결제</strong>: AI 크레딧 구매, 유료
            멤버십 결제, 자료 마켓 수익 정산, 환불 처리
          </li>
          <li>
            <strong>서비스 개선 및 분석</strong>: 서비스 이용 통계 분석,
            오류 추적 및 품질 개선, AI 모델 고도화
          </li>
          <li>
            <strong>마케팅 및 광고</strong>: 신규 기능 안내, 이벤트 정보
            제공(동의한 회원에 한함)
          </li>
        </ol>
      </Article>

      {/* 제2조 */}
      <Article title="제2조 (수집하는 개인정보의 항목 및 수집 방법)">
        <p>회사는 다음과 같은 개인정보를 수집합니다.</p>

        <h4 className="text-14-bold text-black-90 mt-4 mb-2">
          1. 회원가입 시 수집 항목
        </h4>
        <Table
          headers={["수집 방법", "필수 항목", "선택 항목"]}
          rows={[
            [
              "Google 소셜 로그인",
              "이메일 주소, 이름, 프로필 이미지 URL",
              "—",
            ],
            [
              "카카오 소셜 로그인",
              "이메일 주소, 닉네임, 프로필 이미지 URL",
              "—",
            ],
            [
              "이메일 가입 (허용 시)",
              "이메일 주소, 비밀번호(암호화 저장)",
              "—",
            ],
          ]}
        />

        <h4 className="text-14-bold text-black-90 mt-6 mb-2">
          2. 서비스 이용 과정에서 수집되는 항목
        </h4>
        <Table
          headers={["구분", "수집 항목"]}
          rows={[
            [
              "학습자 관리",
              "학습자 이름, 출생연도, 성별, 소속 그룹 (회원이 직접 입력)",
            ],
            [
              "치료 AI (Studio)",
              "아동 진단명, 발달 수준, 치료 목표, 세션 기록, 평가 점수 (회원이 직접 입력)",
            ],
            [
              "이미지 생성 (Image-Gen)",
              "아동 진단 특성, 시각 선호도, 생성 이력 (회원이 직접 입력)",
            ],
            [
              "자동 수집",
              "접속 IP, 쿠키, 브라우저 종류, 접속 일시, 서비스 이용 기록, 오류 로그",
            ],
            ["결제 정보", "결제 수단 정보, 거래 내역 (나이스페이먼츠를 통해 처리)"],
          ]}
        />

        <p className="mt-4">
          ※ 회원이 입력하는 학습자(아동) 정보는 해당 회원의 교육 활동을 위해
          수집되며, 회원은 학습자 또는 법정대리인의 동의를 받은 후 입력하여야
          합니다.
        </p>
      </Article>

      {/* 제3조 */}
      <Article title="제3조 (개인정보의 보유 및 이용 기간)">
        <ol>
          <li>
            회사는 법령에 따른 개인정보 보유 및 이용 기간 또는 정보주체로부터
            개인정보를 수집 시 동의받은 개인정보 보유 및 이용 기간 내에서
            개인정보를 처리 및 보유합니다.
          </li>
          <li>
            각각의 개인정보 보유 및 이용 기간은 다음과 같습니다.
          </li>
        </ol>

        <Table
          headers={["구분", "보유 기간", "근거"]}
          rows={[
            [
              "회원 계정 정보",
              "회원 탈퇴 시까지",
              "서비스 이용계약",
            ],
            [
              "학습자 정보",
              "회원 탈퇴 시 또는 회원이 직접 삭제 시",
              "서비스 이용계약",
            ],
            [
              "치료 세션 기록",
              "회원 탈퇴 시 또는 회원이 직접 삭제 시",
              "서비스 이용계약",
            ],
            [
              "결제 및 거래 기록",
              "5년",
              "전자상거래법 제6조",
            ],
            [
              "계약 또는 청약철회 기록",
              "5년",
              "전자상거래법 제6조",
            ],
            [
              "소비자 불만 또는 분쟁 처리 기록",
              "3년",
              "전자상거래법 제6조",
            ],
            [
              "접속 로그 기록",
              "3개월",
              "통신비밀보호법 제15조의2",
            ],
          ]}
        />
      </Article>

      {/* 제4조 */}
      <Article title="제4조 (개인정보의 제3자 제공)">
        <p>
          회사는 원칙적으로 정보주체의 개인정보를 제1조에서 명시한 목적 범위
          내에서 처리하며, 정보주체의 사전 동의 없이는 본래의 범위를 초과하여
          처리하거나 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는
          예외로 합니다.
        </p>
        <ol>
          <li>정보주체가 사전에 제3자 제공에 동의한 경우</li>
          <li>
            법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에
            따라 수사기관의 요구가 있는 경우
          </li>
        </ol>
      </Article>

      {/* 제5조 */}
      <Article title="제5조 (개인정보 처리의 위탁)">
        <p>
          회사는 원활한 서비스 제공을 위하여 다음과 같이 개인정보 처리 업무를
          위탁하고 있습니다.
        </p>

        <Table
          headers={["수탁업체", "위탁 업무", "처리 항목"]}
          rows={[
            [
              "Supabase Inc.",
              "클라우드 데이터베이스 호스팅, 인증 서비스",
              "회원 계정 정보, 학습자 정보, 서비스 이용 데이터",
            ],
            [
              "Cloudinary Ltd.",
              "이미지 저장 및 CDN 제공",
              "업로드 이미지, AI 생성 이미지",
            ],
            [
              "Google LLC",
              "AI 콘텐츠 생성 (Gemini AI)",
              "익명화된 교육적 맥락 정보 (나이, 진단 코드, 주제 등). 개인식별정보는 전달되지 않음",
            ],
            [
              "나이스페이먼츠 주식회사",
              "전자결제 처리",
              "결제 수단 정보, 거래 금액",
            ],
            [
              "Functional Software, Inc. (Sentry)",
              "오류 추적 및 성능 모니터링",
              "오류 로그, 브라우저 정보, 접속 환경 (개인식별정보 미포함)",
            ],
            [
              "Mixpanel Inc.",
              "서비스 이용 통계 분석",
              "서비스 이용 이벤트, 기능 사용 패턴 (익명화 처리)",
            ],
            [
              "Vercel Inc.",
              "웹 호스팅 및 서버리스 함수 실행, 웹 성능 분석",
              "접속 로그, 페이지뷰 데이터",
            ],
          ]}
        />

        <p className="mt-4">
          회사는 위탁계약 체결 시 「개인정보 보호법」 제26조에 따라 위탁업무
          수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한,
          수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등
          문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고
          있습니다.
        </p>
      </Article>

      {/* 제6조 */}
      <Article title="제6조 (AI 서비스 이용 시 데이터 처리)">
        <ol>
          <li>
            회사는 AI 기능(감정추론, 스토리북, 치료 AI, 이미지 생성 등) 제공을
            위하여 Google LLC의 Gemini AI 모델을 이용합니다.
          </li>
          <li>
            AI 서비스 이용 시 회원이 입력한 학생의 개인식별정보(이름, 생년월일,
            연락처, 센터명 등)는 서버에서 <strong>익명화 처리</strong>된 후
            Google 서버로 전송됩니다. Google에 전달되는 정보는 다음에
            한정됩니다.
            <ol>
              <li>연령대 (출생연도 기반)</li>
              <li>진단 코드 또는 장애 유형</li>
              <li>학습 도메인 (언어, 인지, 감정 등)</li>
              <li>난이도 및 주제</li>
              <li>회원이 입력한 프롬프트 텍스트</li>
            </ol>
          </li>
          <li>
            회사는 Google이 회원의 입력 데이터를 AI 모델 학습에 이용하지 않도록
            API 서비스 약관에 따른 조치를 취하고 있습니다.
          </li>
          <li>
            회원은 AI 프롬프트에 학생의 실명, 연락처 등 개인식별정보를
            입력하지 않도록 주의하여야 합니다. 회원이 자발적으로 프롬프트에
            포함한 개인정보에 대해서는 익명화 처리 범위를 초과할 수 있습니다.
          </li>
        </ol>
      </Article>

      {/* 제7조 */}
      <Article title="제7조 (개인정보의 파기 절차 및 방법)">
        <ol>
          <li>
            회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가
            불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.
          </li>
          <li>
            정보주체로부터 동의받은 개인정보 보유 기간이 경과하거나 처리 목적이
            달성되었음에도 다른 법령에 따라 개인정보를 계속 보존하여야 하는
            경우에는, 해당 개인정보를 별도의 데이터베이스(DB)로 옮기거나
            보관 장소를 달리하여 보존합니다.
          </li>
          <li>
            개인정보 파기의 절차 및 방법은 다음과 같습니다.
            <ol>
              <li>
                파기 절차: 회원이 서비스 탈퇴를 요청하거나, 보유 기간이
                만료된 경우, 회사의 내부 방침 및 관련 법령에 따라 일정
                기간 저장 후 파기합니다.
              </li>
              <li>
                파기 방법: 전자적 파일 형태의 정보는 기록을 재생할 수 없는
                기술적 방법을 사용하여 삭제합니다.
              </li>
            </ol>
          </li>
          <li>
            회원이 등록한 학습자(아동) 정보는 소프트 삭제(삭제 표시) 후 일정
            기간 경과 시 영구 삭제됩니다.
          </li>
        </ol>
      </Article>

      {/* 제8조 */}
      <Article title="제8조 (정보주체와 법정대리인의 권리·의무 및 행사 방법)">
        <ol>
          <li>
            정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련
            권리를 행사할 수 있습니다.
            <ol>
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리정지 요구</li>
            </ol>
          </li>
          <li>
            제1항에 따른 권리 행사는 회사에 대해 서면, 전자우편 등을 통하여
            하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.
          </li>
          <li>
            정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한
            경우에는 회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를
            이용하거나 제공하지 않습니다.
          </li>
          <li>
            만 14세 미만 아동의 개인정보를 처리하는 경우, 회사는
            법정대리인의 동의를 받아야 합니다. 법정대리인은 아동의 개인정보에
            대한 열람, 정정, 삭제, 처리정지를 요구할 수 있습니다.
          </li>
        </ol>
      </Article>

      {/* 제9조 */}
      <Article title="제9조 (개인정보의 안전성 확보 조치)">
        <p>
          회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고
          있습니다.
        </p>
        <ol>
          <li>
            <strong>관리적 조치</strong>: 내부 관리 계획 수립 및 시행,
            개인정보 취급 직원의 최소화 및 교육
          </li>
          <li>
            <strong>기술적 조치</strong>: 개인정보 처리 시스템에 대한 접근권한
            관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안
            프로그램 설치
          </li>
          <li>
            <strong>물리적 조치</strong>: 전산실, 자료보관실 등의 접근 통제
          </li>
          <li>
            <strong>데이터 전송 보안</strong>: 모든 데이터 전송은 SSL/TLS
            암호화를 통해 이루어지며, 데이터베이스 접근은 RLS(Row Level
            Security) 정책으로 사용자 간 데이터 격리를 보장합니다.
          </li>
          <li>
            <strong>비밀번호 관리</strong>: 소셜 로그인의 경우 회사는
            비밀번호를 직접 보관하지 않으며, 이메일 가입의 경우 비밀번호는
            단방향 암호화하여 저장합니다.
          </li>
        </ol>
      </Article>

      {/* 제10조 */}
      <Article title="제10조 (쿠키 및 자동 수집 장치의 운용)">
        <ol>
          <li>
            회사는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 이용 정보를
            저장하고 수시로 불러오는 쿠키(Cookie)를 사용합니다.
          </li>
          <li>
            회사는 다음의 분석 도구를 사용하여 서비스 이용 통계를 수집합니다.
            <ol>
              <li>
                <strong>Mixpanel</strong>: 서비스 이용 이벤트 분석 (기능 사용
                패턴, 페이지 이동 경로)
              </li>
              <li>
                <strong>Vercel Analytics</strong>: Core Web Vitals 및 페이지뷰
                자동 수집
              </li>
              <li>
                <strong>Vercel Speed Insights</strong>: 페이지 로딩 성능 측정
              </li>
              <li>
                <strong>Sentry</strong>: 오류 발생 시 브라우저 환경 정보 및
                에러 로그 수집 (세션 리플레이 포함, 샘플링 적용)
              </li>
            </ol>
          </li>
          <li>
            이용자는 웹 브라우저의 옵션 설정을 통해 쿠키의 허용, 차단을
            선택할 수 있습니다. 다만, 쿠키 저장을 거부할 경우 맞춤형 서비스
            이용에 어려움이 발생할 수 있습니다.
          </li>
        </ol>
      </Article>

      {/* 제11조 */}
      <Article title="제11조 (개인정보 보호책임자)">
        <p>
          회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와
          관련한 정보주체의 불만 처리 및 피해 구제 등을 위하여 아래와 같이
          개인정보 보호책임자를 지정하고 있습니다.
        </p>
        <div className="mt-3 rounded-xl bg-black-5 p-5 text-14-regular text-black-70">
          <p>
            <strong className="text-black-90">개인정보 보호책임자</strong>
          </p>
          <p className="mt-2">성명: 김안호</p>
          <p>직위: 대표</p>
          <p>이메일: rladksgh12@gachon.ac.kr</p>
        </div>
        <p className="mt-4">
          정보주체는 회사의 서비스를 이용하면서 발생한 모든 개인정보 보호 관련
          문의, 불만 처리, 피해 구제 등에 관한 사항을 개인정보 보호책임자에게
          문의하실 수 있습니다. 회사는 정보주체의 문의에 대해 지체 없이 답변 및
          처리해 드리겠습니다.
        </p>
      </Article>

      {/* 제12조 */}
      <Article title="제12조 (권익침해 구제 방법)">
        <p>
          정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회,
          한국인터넷진흥원 개인정보침해신고센터 등에 분쟁 해결이나 상담 등을
          신청할 수 있습니다.
        </p>
        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-black-5 p-5 text-14-regular text-black-70">
          <p>
            개인정보분쟁조정위원회: (국번없이) 1833-6972 (
            <span className="text-primary">www.kopico.go.kr</span>)
          </p>
          <p>
            개인정보침해신고센터: (국번없이) 118 (
            <span className="text-primary">privacy.kisa.or.kr</span>)
          </p>
          <p>
            대검찰청 사이버수사과: (국번없이) 1301 (
            <span className="text-primary">www.spo.go.kr</span>)
          </p>
          <p>
            경찰청 사이버수사국: (국번없이) 182 (
            <span className="text-primary">ecrm.police.go.kr</span>)
          </p>
        </div>
      </Article>

      {/* 제13조 */}
      <Article title="제13조 (개인정보 처리방침의 변경)">
        <ol>
          <li>
            이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른
            변경 내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일
            전부터 서비스 내 공지사항을 통하여 고지할 것입니다.
          </li>
          <li>
            다만, 개인정보의 수집 및 활용, 제3자 제공 등과 같이 이용자 권리의
            중요한 변경이 있을 경우에는 최소 30일 전에 고지하며, 필요 시 이용자
            동의를 다시 받을 수 있습니다.
          </li>
        </ol>
      </Article>

      {/* 부칙 */}
      <div className="mt-12 border-t border-black-15 pt-8">
        <h2 className="text-title-18-bold text-black-90 mb-3">부칙</h2>
        <p className="text-15-regular text-black-70">
          본 개인정보 처리방침은 2026년 ○월 ○일부터 시행합니다.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPage;

/* ── 섹션 컴포넌트 ── */

interface ArticleProps {
  title: string;
  children: React.ReactNode;
}

const Article = ({ title, children }: ArticleProps) => (
  <article className="mb-10">
    <h3 className="text-title-16-semibold text-black-90 mb-3">{title}</h3>
    <div className="text-15-regular text-black-70 flex flex-col gap-2 [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-1.5 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol_ol]:list-[lower-alpha] [&_ol_ol]:mt-1.5 [&_p]:leading-relaxed [&_li]:leading-relaxed [&_strong]:text-black-90">
      {children}
    </div>
  </article>
);

interface TableProps {
  headers: string[];
  rows: string[][];
}

const Table = ({ headers, rows }: TableProps) => (
  <div className="mt-3 overflow-x-auto rounded-xl border border-black-15">
    <table className="w-full text-14-regular">
      <thead>
        <tr className="bg-black-5">
          {headers.map((h) => (
            <th
              key={h}
              className="px-4 py-2.5 text-left text-13-bold text-black-90"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-t border-black-10">
            {row.map((cell, j) => (
              <td key={j} className="px-4 py-2.5 text-black-70">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
