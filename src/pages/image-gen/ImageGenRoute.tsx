/**
 * /image-gen/:sessionId? 라우트 가드 — role이 "tester" 또는 "admin"인 유저만 접근 가능.
 * sessionId가 있으면 해당 세션을 로드, 없으면 새 대화 상태.
 */
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { ImageGenPage } from "@/features/image-gen/pages/ImageGenPage";

const ImageGenRoute = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const role = useAuthStore((s) => s.role);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || (role !== "tester" && role !== "admin")) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, role, navigate]);

  if (isLoading) return null;
  if (!isAuthenticated || (role !== "tester" && role !== "admin")) return null;

  return <ImageGenPage sessionId={sessionId} />;
};

export default ImageGenRoute;
