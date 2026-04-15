import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <div className="flex w-full px-13 flex-col items-center justify-center border-t border-black-25">
      <footer className="flex w-full flex-col gap-3 px-3 py-8">
        <div className="flex text-title-18-bold">MURU.AI</div>
        <div className="flex flex-col gap-1 text-title-14-semibold text-black-50">
          <div className="flex">
            대표 : 김안호 | 사업자 등록번호 : 581-10-02753
          </div>
          <div className="flex">
            주소 : 경기도 성남시 수정구 성남대로 1390번길 33-3
          </div>
        </div>
        <div className="flex gap-4 text-title-14-semibold text-black-90">
          <Link to="/terms" target="_blank" className="hover:text-primary transition-colors">
            서비스 이용약관
          </Link>
          <Link to="/privacy" target="_blank" className="hover:text-primary transition-colors">
            개인정보 처리방침
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
