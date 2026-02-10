import { Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { useModalStore } from "@/shared/store/useModalStore";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useScheduleStore } from "../store/useScheduleStore";
import BaseModal from "@/shared/ui/BaseModal";
import { studentModel, type Student } from "../model/student.model";
import { groupModel, type Group } from "../model/group.model";
import { scheduleModel } from "../model/schedule.model";
import {
  type ScheduleFormData,
  initialFormData,
  generateTimeOptions,
  calculateEndTimeOptions,
  validateScheduleForm,
} from "../model/scheduleForm.model";

const AddScheduleModal = () => {
  const { openModal, closeModal } = useModalStore();
  const { isAuthenticated } = useAuthStore();
  const { editingSchedule, setEditingSchedule } = useScheduleStore();
  const [formData, setFormData] = useState<ScheduleFormData>(initialFormData);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const isOpen = openModal === "addSchedule";
  const isEditMode = !!editingSchedule;

  const timeOptions = generateTimeOptions();
  const endTimeOptions = calculateEndTimeOptions(formData, timeOptions);

  // editingSchedule이 변경될 때 form 채우기
  useEffect(() => {
    if (editingSchedule && isOpen) {
      setFormData({
        title: editingSchedule.title,
        startDate: editingSchedule.start_date,
        endDate: editingSchedule.end_date,
        startTime: editingSchedule.start_time.substring(0, 5),
        endTime: editingSchedule.end_time.substring(0, 5),
        isRepeating: editingSchedule.is_repeating,
        repeatEndDate: editingSchedule.repeat_end_date || "",
        targetType: editingSchedule.target_type,
        selectedTarget:
          editingSchedule.target_type === "individual"
            ? editingSchedule.student_id || ""
            : editingSchedule.group_id || "",
      });
    } else if (!editingSchedule && isOpen) {
      handleReset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSchedule, isOpen]);

  // 학생 목록 불러오기
  useEffect(() => {
    const fetchStudents = async () => {
      if (!isAuthenticated) {
        setStudents([]);
        return;
      }
      const { data } = await studentModel.getAll();

      if (data) {
        setStudents(data);
      }
    };

    fetchStudents();
  }, [isAuthenticated, openModal]);

  // 그룹 목록 불러오기
  useEffect(() => {
    const fetchGroups = async () => {
      if (!isAuthenticated) {
        setGroups([]);
        return;
      }

      const { data } = await groupModel.getAll();

      if (data) {
        setGroups(data);
      }
    };

    fetchGroups();
  }, [isAuthenticated, openModal]);

  const handleReset = () => {
    setFormData(initialFormData);
    setEditingSchedule(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditMode && editingSchedule?.id) {
        // 수정 모드
        const { data, error } = await scheduleModel.update(editingSchedule.id, {
          title: formData.title,
          start_date: formData.startDate,
          end_date: formData.endDate,
          start_time: formData.startTime,
          end_time: formData.endTime,
          is_repeating: formData.isRepeating,
          repeat_end_date: formData.isRepeating ? formData.repeatEndDate : undefined,
          target_type: formData.targetType,
          student_id: formData.targetType === "individual" ? formData.selectedTarget : undefined,
          group_id: formData.targetType === "group" ? formData.selectedTarget : undefined,
        });

        if (error) {
          console.error("일정 수정 실패:", error);
          alert(error.message || "일정 수정에 실패했습니다.");
          return;
        }

        console.log("일정 수정 성공:", data);
      } else {
        // 추가 모드
        const { data, error } = await scheduleModel.create({
          title: formData.title,
          start_date: formData.startDate,
          end_date: formData.endDate,
          start_time: formData.startTime,
          end_time: formData.endTime,
          is_repeating: formData.isRepeating,
          repeat_end_date: formData.isRepeating ? formData.repeatEndDate : undefined,
          target_type: formData.targetType,
          student_id: formData.targetType === "individual" ? formData.selectedTarget : undefined,
          group_id: formData.targetType === "group" ? formData.selectedTarget : undefined,
        });

        if (error) {
          console.error("일정 추가 실패:", error);
          alert(error.message || "일정 추가에 실패했습니다.");
          return;
        }

        console.log("일정 추가 성공:", data);
      }

      handleReset();
      closeModal();
    } catch (err) {
      console.error("일정 처리 중 오류:", err);
      alert("일정 처리 중 오류가 발생했습니다.");
    }
  };

  const isSubmitDisabled = !validateScheduleForm(formData);
  const targetList = formData.targetType === "individual" ? students : groups;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={closeModal}
      onReset={handleReset}
      title={
        <h2 className="flex items-center gap-2 text-title-20-semibold text-black-100">
          <Calendar className="h-5 w-5 text-primary" />
          {isEditMode ? "일정 수정" : "새 일정 추가"}
        </h2>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 제목 */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="title"
            className="text-title-14-semibold text-black-100"
          >
            제목
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => { setFormData({ ...formData, title: e.target.value }); }}
            className="rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
            placeholder="제목을 입력하세요"
            required
          />
        </div>

        {/* 날짜 및 시간 */}
        <div className="flex flex-col gap-2">
          <label className="text-title-14-semibold text-black-100">
            날짜 및 시간
          </label>

          {/* 시작 */}
          <div className="flex gap-2 items-center">
            <span className="text-15-regular text-black-70 w-12">시작</span>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => { setFormData({ ...formData, startDate: e.target.value }); }}
              className="flex-1 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
              required
            />
            <select
              value={formData.startTime}
              onChange={(e) => { setFormData({ ...formData, startTime: e.target.value }); }}
              className="flex-1 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 tabular-nums transition focus:border-primary focus:outline-none"
              required
            >
              <option value="">시간 선택</option>
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          {/* 종료 */}
          <div className="flex gap-2 items-center">
            <span className="text-15-regular text-black-70 w-12">종료</span>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => { setFormData({ ...formData, endDate: e.target.value }); }}
              min={formData.startDate}
              className="flex-1 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
              required
            />
            <select
              value={formData.endTime}
              onChange={(e) => { setFormData({ ...formData, endTime: e.target.value }); }}
              className="flex-1 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 tabular-nums transition focus:border-primary focus:outline-none"
              disabled={!formData.startTime || !formData.startDate || !formData.endDate}
              required
            >
              <option value="">시간 선택</option>
              {endTimeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 매주 반복 */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isRepeating}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  isRepeating: e.target.checked,
                  repeatEndDate: e.target.checked ? formData.repeatEndDate : "",
                });
              }}
              className="w-4 h-4 rounded border-black-30 text-primary transition focus:ring-2 focus:ring-primary focus:ring-offset-0"
            />
            <span className="text-15-regular text-black-100">매주 반복</span>
          </label>

          {formData.isRepeating && (
            <div className="flex gap-2 items-center ml-6">
              <span className="text-15-regular text-black-70 w-16">종료일</span>
              <input
                type="date"
                value={formData.repeatEndDate}
                onChange={(e) => { setFormData({ ...formData, repeatEndDate: e.target.value }); }}
                min={formData.startDate}
                className="flex-1 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
                required={formData.isRepeating}
              />
            </div>
          )}
        </div>

        {/* 수업 대상 */}
        <div className="flex flex-col gap-2">
          <label className="text-title-14-semibold text-black-100">
            수업 대상
          </label>

          {/* 대상 타입 선택 */}
          <div className="flex items-center gap-1 rounded-full border border-black-20 bg-black-10 p-1">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  targetType: "individual",
                  selectedTarget: "",
                });
              }}
              className={`flex-1 rounded-full px-4 py-2 text-title-14-semibold transition ${
                formData.targetType === "individual"
                  ? "bg-linear-to-br from-[#5500ff]/40 to-[#7700ff]/40 text-black-100 shadow-sm"
                  : "text-black-70 hover:bg-black-15"
              }`}
            >
              개별 아동
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  targetType: "group",
                  selectedTarget: "",
                });
              }}
              className={`flex-1 rounded-full px-4 py-2 text-title-14-semibold transition ${
                formData.targetType === "group"
                  ? "bg-linear-to-br from-[#5500ff]/40 to-[#7700ff]/40 text-black-100 shadow-sm"
                  : "text-black-70 hover:bg-black-15"
              }`}
            >
              그룹 수업
            </button>
          </div>

          {/* 대상 선택 드롭다운 */}
          <select
            value={formData.selectedTarget}
            onChange={(e) => { setFormData({ ...formData, selectedTarget: e.target.value }); }}
            className="rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none disabled:bg-black-5 disabled:text-black-60 disabled:cursor-not-allowed"
            disabled={targetList.length === 0}
            required
          >
            <option value="">
              {targetList.length === 0
                ? formData.targetType === "individual"
                  ? "먼저 아동을 추가해주세요"
                  : "먼저 그룹을 추가해주세요"
                : formData.targetType === "individual"
                ? "아동을 선택하세요"
                : "그룹을 선택하세요"}
            </option>
            {targetList.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
              </option>
            ))}
          </select>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={() => {
              handleReset();
              closeModal();
            }}
            className="flex-1 rounded-lg border border-black-30 px-4 py-3 text-title-14-semibold text-black-70 transition hover:bg-black-10"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`flex-1 rounded-lg px-4 py-3 text-title-14-semibold text-white-100 transition ${
              isSubmitDisabled
                ? "bg-black-40 cursor-not-allowed"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isEditMode ? "수정하기" : "추가하기"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default AddScheduleModal;
