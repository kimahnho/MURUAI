/**
 * 관리자 대시보드 지표 조회와 필터 상태를 관리하는 훅.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminMetrics, type AdminMetrics } from "../api/adminMetrics";

export type DateRangePreset = "7d" | "30d" | "custom";

export type DateRangeState = {
  preset: DateRangePreset;
  start: string;
  end: string;
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const buildPresetRange = (preset: DateRangePreset): DateRangeState => {
  const today = new Date();
  if (preset === "7d") {
    const start = addDays(today, -6);
    return {
      preset,
      start: toDateInputValue(start),
      end: toDateInputValue(today),
    };
  }
  if (preset === "30d") {
    const start = addDays(today, -29);
    return {
      preset,
      start: toDateInputValue(start),
      end: toDateInputValue(today),
    };
  }
  return {
    preset,
    start: toDateInputValue(today),
    end: toDateInputValue(today),
  };
};

const normalizeRange = (start: string, end: string) => {
  if (!start || !end) {
    const today = toDateInputValue(new Date());
    return { start: start || today, end: end || today };
  }
  return start <= end ? { start, end } : { start: end, end: start };
};

export const useAdminDashboard = () => {
  const [range, setRange] = useState<DateRangeState>(() =>
    buildPresetRange("7d")
  );

  const query = useQuery<AdminMetrics, Error>({
    queryKey: ["adminMetrics", range.start, range.end],
    queryFn: () => fetchAdminMetrics({ start: range.start, end: range.end }),
  });

  const setPreset = (preset: DateRangePreset) => {
    if (preset === "custom") {
      setRange((prev) => ({
        ...prev,
        preset,
      }));
      return;
    }
    setRange(buildPresetRange(preset));
  };

  const setCustomRange = (start: string, end: string) => {
    const normalized = normalizeRange(start, end);
    setRange({ preset: "custom", ...normalized });
  };

  const errorMessage = query.error?.message ?? null;

  return {
    range,
    metrics: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    errorMessage,
    refetch: query.refetch,
    setPreset,
    setCustomRange,
  };
};
