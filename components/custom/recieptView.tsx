"use client";

import { useState } from "react";
import { Search, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ReceiptViewProps {
  countedItems: any[];
}

export default function ReceiptView({ countedItems }: ReceiptViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = countedItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item["default store"] || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  const handleGeneratePDF = async () => {
    try {
      // Dynamically import jsPDF for client-side PDF generation
      const jsPDFModule = await import("jspdf");
      const { jsPDF } = jsPDFModule;
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.text("Shopping List", 105, 15, { align: "center" });

      // Add date and time
      doc.setFontSize(12);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 25);
      doc.text(`Time: ${new Date().toLocaleTimeString()}`, 20, 32);

      // Add table header
      doc.setFontSize(10);
      doc.text("Item Name", 20, 60);
      doc.text("Current", 100, 60);
      doc.text("Min Stock", 130, 60);
      doc.text("To Buy", 160, 60);
      doc.text("Store", 180, 60);

      // Add line
      doc.line(20, 62, 190, 62);

      // Add items - only include items that need purchasing
      let y = 70;
      countedItems
        .filter((item) => {
          const toBuy = Math.max(
            0,
            (item["min stock amount"] || 0) -
              (item["current quantity"] || item.currentCount || 0)
          );
          return toBuy > 0;
        })
        .sort((a, b) =>
          (a["default store"] || "").localeCompare(b["default store"] || "")
        )
        .forEach((item) => {
          const toBuy = Math.max(
            0,
            (item["min stock amount"] || 0) -
              (item["current quantity"] || item.currentCount || 0)
          );

          doc.text(item.name.substring(0, 30), 20, y);
          doc.text(
            (item["current quantity"] || item.currentCount || 0).toString(),
            100,
            y
          );
          doc.text((item["min stock amount"] || 0).toString(), 130, y);
          doc.text(toBuy.toString(), 160, y);
          doc.text((item["default store"] || "").substring(0, 15), 180, y);
          y += 8;

          // Add new page if needed
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
        });

      // Add footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Inventory Shopping List - Generated on ${new Date().toLocaleString()}`,
          105,
          290,
          {
            align: "center",
          }
        );
        doc.text(`Page ${i} of ${pageCount}`, 190, 290, { align: "right" });
      }

      // Save PDF
      const filename = `shopping-list-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("There was an error generating the PDF. Please try again.");
    }
  };

  // Count items that need purchasing
  const itemsNeedingPurchase = countedItems.filter(
    (item) =>
      (item["min stock amount"] || 0) -
        (item["current quantity"] || item.currentCount || 0) >
      0
  ).length;

  // And in the items mapping logic:
  filteredItems.map((item) => {
    const toBuy = Math.max(
      0,
      (item["min stock amount"] || 0) -
        (item["current quantity"] || item.currentCount || 0)
    );
    return (
      <div
        key={item.id}
        className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
      >
        {/* Rest of your component */}
      </div>
    );
  });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Shopping List</CardTitle>
        <Button variant="outline" onClick={handleGeneratePDF}>
          <Download className="h-4 w-4 mr-2" />
          Save as PDF
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Badge variant="outline" className="px-3 py-1">
            {countedItems.length} items counted
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-yellow-50">
            {itemsNeedingPurchase} items need purchasing
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-2 mt-4">
          {filteredItems.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-muted-foreground">No items found</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const toBuy = Math.max(
                0,
                (item["min stock amount"] || 0) - (item.currentCount || 0)
              );
              return (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{item.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Store: {item["default store"] || "Not specified"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-medium">
                        {item["current quantity"] || item.currentCount || 0} in
                        stock
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Min: {item["min stock amount"] || 0}
                      </p>
                    </div>
                    {toBuy > 0 && (
                      <Badge variant="outline" className="bg-yellow-50">
                        Buy {toBuy}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
