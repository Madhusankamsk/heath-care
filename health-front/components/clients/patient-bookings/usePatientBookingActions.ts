"use client";

import { useState } from "react";

import type { UpcomingBookingRow } from "@/components/dispatch/types";
import type { SampleForm } from "@/components/clients/patient-bookings/types";
import { diagnosisRemarkFromVisit, safeFileKeySegment } from "@/components/clients/patient-bookings/utils";
import {
  createDiagnosticReportApi,
  createLabSampleApi,
  deleteLabSampleApi,
  patchDispatchStatusApi,
  saveVisitDraftApi,
  uploadFileApi,
} from "@/lib/patientBookingsApi";
import { toast } from "@/lib/toast";

export function usePatientBookingActions(onAfterSuccess: () => void) {
  const [busyDispatchId, setBusyDispatchId] = useState<string | null>(null);
  const [diagnosisRemarkDraftByBookingId, setDiagnosisRemarkDraftByBookingId] = useState<
    Record<string, string>
  >({});
  const [sampleFormByBookingId, setSampleFormByBookingId] = useState<Record<string, SampleForm>>({});
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null);
  const [uploadingReportBookingId, setUploadingReportBookingId] = useState<string | null>(null);
  const [addingSampleBookingId, setAddingSampleBookingId] = useState<string | null>(null);
  const [removingSampleId, setRemovingSampleId] = useState<string | null>(null);

  function diagnosisRemarkDraftForBooking(b: UpcomingBookingRow): string {
    if (diagnosisRemarkDraftByBookingId[b.id] !== undefined) {
      return diagnosisRemarkDraftByBookingId[b.id] ?? "";
    }
    return diagnosisRemarkFromVisit(b);
  }

  function setDiagnosisRemarkDraft(bookingId: string, value: string) {
    setDiagnosisRemarkDraftByBookingId((prev) => ({ ...prev, [bookingId]: value }));
  }

  function sampleFormForBooking(b: UpcomingBookingRow): SampleForm {
    return sampleFormByBookingId[b.id] ?? { sampleTypeLookupId: "", labName: "" };
  }

  function setSampleFormForBooking(bookingId: string, form: SampleForm) {
    setSampleFormByBookingId((prev) => ({ ...prev, [bookingId]: form }));
  }

  async function patchDispatchStatus(
    dispatchId: string,
    statusLookupKey: "ARRIVED" | "COMPLETED",
    remark?: string | null,
  ) {
    setBusyDispatchId(dispatchId);
    try {
      await patchDispatchStatusApi(dispatchId, statusLookupKey, remark);
      const msg =
        statusLookupKey === "ARRIVED"
          ? "Marked as arrived."
          : "Visit completed.";
      toast.success(msg);
      onAfterSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyDispatchId(null);
    }
  }

  async function saveVisitDraftForBooking(b: UpcomingBookingRow) {
    const text = diagnosisRemarkDraftForBooking(b).trim();
    setSavingBookingId(b.id);
    try {
      await saveVisitDraftApi(b.id, text ? text : null);
      toast.success("Draft saved.");
      setDiagnosisRemarkDraftByBookingId((prev) => {
        const next = { ...prev };
        delete next[b.id];
        return next;
      });
      onAfterSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingBookingId(null);
    }
  }

  async function uploadReportsForBooking(b: UpcomingBookingRow, files: FileList | null) {
    if (!files?.length) return;
    setUploadingReportBookingId(b.id);
    try {
      for (const file of Array.from(files)) {
        const key = `diagnostic-reports/${b.id}/${crypto.randomUUID()}-${safeFileKeySegment(file.name)}`;
        const url = await uploadFileApi(file, key);
        await createDiagnosticReportApi(b.id, { reportName: file.name, fileUrl: url });
      }
      toast.success(files.length > 1 ? "Reports uploaded." : "Report uploaded.");
      onAfterSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingReportBookingId(null);
    }
  }

  async function submitLabSample(b: UpcomingBookingRow) {
    const form = sampleFormForBooking(b);
    if (!form.sampleTypeLookupId.trim()) {
      toast.error("Select a sample type.");
      return;
    }
    if (!form.labName.trim()) {
      toast.error("Enter a description.");
      return;
    }
    setAddingSampleBookingId(b.id);
    try {
      await createLabSampleApi(b.id, {
        sampleTypeLookupId: form.sampleTypeLookupId.trim(),
        labName: form.labName.trim(),
      });
      toast.success("Sample recorded.");
      setSampleFormByBookingId((prev) => ({
        ...prev,
        [b.id]: { sampleTypeLookupId: "", labName: "" },
      }));
      onAfterSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setAddingSampleBookingId(null);
    }
  }

  async function removeLabSample(b: UpcomingBookingRow, sampleId: string) {
    setRemovingSampleId(sampleId);
    try {
      await deleteLabSampleApi(b.id, sampleId);
      toast.success("Sample removed.");
      onAfterSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setRemovingSampleId(null);
    }
  }

  return {
    busyDispatchId,
    savingBookingId,
    uploadingReportBookingId,
    addingSampleBookingId,
    removingSampleId,
    diagnosisRemarkDraftForBooking,
    setDiagnosisRemarkDraft,
    sampleFormForBooking,
    setSampleFormForBooking,
    patchDispatchStatus,
    saveVisitDraftForBooking,
    uploadReportsForBooking,
    submitLabSample,
    removeLabSample,
  };
}
