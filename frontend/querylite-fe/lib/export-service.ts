"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import pptxgen from "pptxgenjs";

export const exportDashboardToPDF = async (dashboardId: string, dashboardName: string) => {
    const dashboardElement = document.getElementById(`dashboard-content-${dashboardId}`);
    if (!dashboardElement) {
        console.error("Dashboard element not found");
        return;
    }

    try {
        const canvas = await html2canvas(dashboardElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#0f172a", // Match slate-900
            logging: false,
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
            orientation: "landscape",
            unit: "px",
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save(`${dashboardName.replace(/\s+/g, "_")}_Export.pdf`);
    } catch (error) {
        console.error("PDF Export failed", error);
        throw error;
    }
};

export const exportDashboardToPPT = async (dashboardId: string, dashboardName: string, panelElements: { title: string, id: string }[]) => {
    const pptx = new pptxgen();

    // Title Slide
    let slide = pptx.addSlide();
    slide.background = { fill: "0F172A" };
    slide.addText("QueryLite Executive Report", {
        x: 0,
        y: "30%",
        w: "100%",
        align: "center",
        fontSize: 44,
        color: "7C3AED", // violet-600
        bold: true
    });
    slide.addText(dashboardName, {
        x: 0,
        y: "50%",
        w: "100%",
        align: "center",
        fontSize: 24,
        color: "FFFFFF"
    });
    slide.addText(`Generated on ${new Date().toLocaleDateString()}`, {
        x: 0,
        y: "80%",
        w: "100%",
        align: "center",
        fontSize: 12,
        color: "94A3B8"
    });

    // Panel Slides
    for (const panel of panelElements) {
        const element = document.getElementById(`panel-content-${panel.id}`);
        if (element) {
            try {
                const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#0f172a" });
                const imgData = canvas.toDataURL("image/png");

                let pSlide = pptx.addSlide();
                pSlide.background = { fill: "0F172A" };
                pSlide.addText(panel.title, { x: 0.5, y: 0.2, color: "FFFFFF", fontSize: 18, bold: true });
                pSlide.addImage({
                    data: imgData,
                    x: 0.5,
                    y: 0.8,
                    w: 9,
                    h: 5
                });
            } catch (err) {
                console.warn(`Failed to capture panel ${panel.title}`, err);
            }
        }
    }

    pptx.writeFile({ fileName: `${dashboardName.replace(/\s+/g, "_")}_Report.pptx` });
};
