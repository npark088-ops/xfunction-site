// Client-only — jsPDF draws directly to a <canvas>-backed document, so
// this must never run during SSR. Callers (grades page) only invoke it
// from a click handler, which is already client-side.

export interface PdfCategoryRow {
  name: string;
  percentage: number | null;
  weight: number;
}

export interface PdfStudyGuideTopic {
  title: string;
  explanation: string;
}

export async function downloadGradePdf({
  courseName,
  currentGrade,
  letterGrade,
  breakdown,
  studyGuideTopics,
}: {
  courseName: string;
  currentGrade: number;
  letterGrade: string;
  breakdown: PdfCategoryRow[];
  studyGuideTopics: PdfStudyGuideTopic[] | null;
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const marginX = 16;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  const ensureRoom = (needed: number) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 20;
    }
  };

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(courseName, marginX, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110, 110, 110);
  doc.text(`xFunction · exported ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, marginX, y);
  y += 12;

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Current grade", marginX, y);
  y += 8;
  doc.setFontSize(22);
  doc.text(`${currentGrade.toFixed(1)}%  (${letterGrade})`, marginX, y);
  y += 12;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Category breakdown", marginX, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  for (const row of breakdown) {
    ensureRoom(8);
    const pct = row.percentage !== null ? `${Math.round(row.percentage)}%` : "—";
    doc.text(`${row.name}`, marginX, y);
    doc.text(`${pct}  (${row.weight}% weight)`, pageWidth - marginX, y, { align: "right" });
    y += 7;
  }
  y += 6;

  if (studyGuideTopics && studyGuideTopics.length > 0) {
    ensureRoom(14);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Study guide", marginX, y);
    y += 9;

    for (const topic of studyGuideTopics) {
      ensureRoom(14);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(topic.title, marginX, y);
      y += 6;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const lines: string[] = doc.splitTextToSize(topic.explanation, pageWidth - marginX * 2);
      for (const line of lines) {
        ensureRoom(6);
        doc.text(line, marginX, y);
        y += 5;
      }
      y += 5;
    }
  }

  const safeName = courseName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  doc.save(`${safeName || "course"}-grades.pdf`);
}
