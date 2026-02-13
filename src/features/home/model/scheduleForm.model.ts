/**
 * 일정 생성/수정 폼에서 사용하는 값 타입을 정의하는 모델 모듈.
 */
export interface ScheduleFormData {
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isRepeating: boolean;
  repeatEndDate: string;
  targetType: "individual" | "group";
  selectedTarget: string;
}

export const initialFormData: ScheduleFormData = {
  title: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  isRepeating: false,
  repeatEndDate: "",
  targetType: "individual",
  selectedTarget: "",
};

// 시간 옵션 생성 (08:00 ~ 20:00, 30분 단위)
export const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    options.push(`${hour.toString().padStart(2, "0")}:00`);
    if (hour < 20) {
      options.push(`${hour.toString().padStart(2, "0")}:30`);
    }
  }
  return options;
};

// 종료 시간 옵션 계산 (시작 시간 이후만)
export const calculateEndTimeOptions = (
  formData: ScheduleFormData,
  timeOptions: string[]
): string[] => {
  if (!formData.startTime || !formData.startDate || !formData.endDate) {
    return timeOptions;
  }

  // 시작일과 종료일이 같은 경우에만 시작 시간 이후로 제한
  if (formData.startDate === formData.endDate) {
    const startIndex = timeOptions.indexOf(formData.startTime);
    return timeOptions.slice(startIndex + 1);
  }

  // 종료일이 시작일보다 나중이면 모든 시간 선택 가능
  return timeOptions;
};

// Form 유효성 검증
export const validateScheduleForm = (formData: ScheduleFormData): boolean => {
  return !(
    !formData.title.trim() ||
    !formData.startDate ||
    !formData.endDate ||
    !formData.startTime ||
    !formData.endTime ||
    !formData.selectedTarget ||
    (formData.isRepeating && !formData.repeatEndDate)
  );
};
