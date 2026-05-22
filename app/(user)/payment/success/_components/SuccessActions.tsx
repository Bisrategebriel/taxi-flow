"use client";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  routeLabel: string;
  tripRef: string;
  total: string;
  dateLabel: string;
  durationLabel: string;
  distanceLabel: string;
  paymentMethodLabel: string;
}

export default function SuccessActions({
  routeLabel,
  tripRef,
  total,
  dateLabel,
  durationLabel,
  distanceLabel,
  paymentMethodLabel,
}: Props) {
  async function handleReceipt() {
    const { jsPDF } = await import("jspdf");

    // Load logo as data URL — fall back gracefully if unavailable
    let logoDataUrl: string | null = null;
    try {
      const res = await fetch("/taxiflow-logo.png");
      if (res.ok) {
        const blob = await res.blob();
        logoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch { /* continue without logo */ }

    const pageW = 100;
    const cx = pageW / 2;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [pageW, 155] });

    let y = 12;

    // ── Brand header: large centered logo ────────────────────────
    const logoH = 20;
    const logoW = logoH * 1.5; // known aspect ratio 1536×1024

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", cx - logoW / 2, y, logoW, logoH);
    }

    y += logoH + 6;

    // ── Lucide CheckCircle2 style icon ────────────────────────
    // SVG viewBox 24×24: circle r=10 at (12,12), check path "m9 12 2 2 4-4"
    // Scaled to r=6mm at (cx, y+6)
    const cr = 6;
    const circleY = y + cr;
    doc.setFillColor("#dcfce7");
    doc.setDrawColor("#dcfce7");
    doc.circle(cx, circleY, cr, "F");

    // Check mark — scale factor: cr/10 = 0.6
    // (9,12)→(11,14)→(15,10) relative to viewBox center (12,12)
    // → jsPDF: (cx + (svg_x-12)*0.6, circleY + (svg_y-12)*0.6)
    doc.setDrawColor("#16a34a");
    doc.setLineWidth(0.75);
    doc.line(cx - 1.8, circleY + 0.0, cx - 0.6, circleY + 1.2);
    doc.line(cx - 0.6, circleY + 1.2, cx + 1.8, circleY - 1.2);

    y = circleY + cr + 5;

    // ── Title ────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor("#111827");
    doc.text("Payment Complete", cx, y, { align: "center" });
    y += 6;

    // ── Paid badge ───────────────────────────────────────────
    const badgeW = 22;
    const badgeH = 5.5;
    doc.setFillColor("#dcfce7");
    doc.setDrawColor("#dcfce7");
    doc.roundedRect(cx - badgeW / 2, y - 3.8, badgeW, badgeH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor("#15803d");
    doc.text("PAID", cx, y + 0.2, { align: "center" });
    y += 10;

    // ── Receipt card ─────────────────────────────────────────
    const cardX = 8;
    const cardInnerX = 14;
    const cardRightX = pageW - 14;
    const cardW = pageW - 16;

    // Helvetica only covers Latin-1; replace the → arrow with ASCII ›
    const pdfRoute = routeLabel.replace(/→/g, ">");

    // Calculate card height before drawing it
    const routeLines = doc.splitTextToSize(pdfRoute, cardW - 10) as string[];
    const routeH = routeLines.length * 5;
    const cardH = 6 + 4 + routeH + 3 + 4 + 5 * 6 + 2 + 4 + 7 + 6;

    doc.setFillColor("#f9fafb");
    doc.setDrawColor("#e5e7eb");
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, y, cardW, cardH, 3, 3, "FD");

    y += 5;

    // Route
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor("#9ca3af");
    doc.text("ROUTE", cardInnerX, y);
    y += 4.5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor("#111827");
    doc.text(routeLines as string[], cardInnerX, y);
    y += routeH + 2;

    // Divider
    doc.setDrawColor("#e5e7eb");
    doc.setLineWidth(0.25);
    doc.line(cardInnerX, y, cardRightX, y);
    y += 5;

    // Data rows
    const rows: [string, string][] = [
      ["Trip ID", tripRef],
      ["Date", dateLabel],
      ["Duration", durationLabel],
      ["Distance", distanceLabel],
      ["Payment", paymentMethodLabel],
    ];

    for (const [label, value] of rows) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor("#6b7280");
      doc.text(label, cardInnerX, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor("#111827");
      doc.text(value, cardRightX, y, { align: "right" });
      y += 6;
    }

    y += 1;

    // Divider
    doc.setDrawColor("#e5e7eb");
    doc.setLineWidth(0.25);
    doc.line(cardInnerX, y, cardRightX, y);
    y += 5;

    // Total
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor("#111827");
    doc.text("Total", cardInnerX, y);
    doc.setTextColor("#16a34a");
    doc.text(`ETB ${total}`, cardRightX, y, { align: "right" });

    y += 14;

    // ── Footer ───────────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor("#9ca3af");
    doc.text("Thank you for using TaxiFlow.", cx, y, { align: "center" });
    y += 4.5;
    doc.text("A receipt has been sent to your email address.", cx, y, { align: "center" });

    doc.save(`taxiflow-receipt-${tripRef}.pdf`);
  }

  async function handleShare() {
    const text = `TaxiFlow trip receipt\nRoute: ${routeLabel}\nTrip: ${tripRef}\nTotal: ETB ${total}`;
    try {
      await navigator.share({ title: "TaxiFlow Receipt", text });
    } catch {
      try {
        await navigator.clipboard.writeText(text);
      } catch { /* clipboard blocked */ }
    }
  }

  return (
    <div className="flex gap-3">
      <Button variant="outline" className="flex-1 gap-2" onClick={handleReceipt}>
        <Download size={14} />
        Receipt
      </Button>
      <Button variant="outline" className="flex-1 gap-2" onClick={handleShare}>
        <Share2 size={14} />
        Share
      </Button>
    </div>
  );
}
