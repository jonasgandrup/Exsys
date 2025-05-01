// import { createClient } from "@/utils/supabase/server";

// export default async function Page() {
//   const supabase = await createClient();
//   const { data: notes } = await supabase.from("notes").select();

//   return <pre>{JSON.stringify(notes, null, 2)}</pre>;
// }
// Client component for interactivity
"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Search,
  ArrowUpDown,
  Package,
  FileText,
  LayoutGrid,
  Receipt,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";
import ItemCountCard from "@/components/custom/itemCountCard";
import ReceiptView from "@/components/custom/recieptView";
// import ItemCountCard, { InventoryItem } from "@/components/ItemCountCard";

// Define the type for your inventory items
type InventoryItem = {
  id: number;
  name: string;
  location: string;
  "min stock amount": number;
  "default quantity unit purchase": string;
  "quantity unit stock": string;
  "product group": string;
  "default store": string;
};

export default function Page() {
  return (
    <div className="container mx-auto w-full py-6">
      <InventoryDisplay />
    </div>
  );
}

function InventoryDisplay() {
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  const [countingComplete, setCountingComplete] = useState(false);
  const [countedItems, setCountedItems] = useState<InventoryItem[]>([]);
  const [activeTab, setActiveTab] = useState("grid");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [selectedGridItem, setSelectedGridItem] =
    useState<InventoryItem | null>(null);

  // Use useEffect to fetch data when the component mounts
  React.useEffect(() => {
    async function fetchData() {
      const supabase = await createClient();
      const { data } = await supabase.from("notes").select();
      setItems(data || []);
    }

    fetchData();
  }, []);

  // Filter items based on search query
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item["product group"].toLowerCase().includes(searchQuery.toLowerCase())
  );
  // const countableItems = filteredItems.filter(
  //   (item) => (item["min stock amount"] || 0) > 0
  // );
  //todo: for testing only!!!
  const countableItems = filteredItems
    .filter((item) => (item["min stock amount"] || 0) > 0)
    .slice(0, 10); // Limit to first 10 items for testing

  // Functions for navigating between items
  const goToNextItem = () => {
    if (currentItemIndex < countableItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    }
  };

  const goToPrevItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    }
  };

  const updateItemCount = (updatedItem: InventoryItem) => {
    // Update the countedItems array by adding this item
    const existingItemIndex = countedItems.findIndex(
      (item) => item.id === updatedItem.id
    );

    if (existingItemIndex !== -1) {
      const updatedCountedItems = [...countedItems];
      updatedCountedItems[existingItemIndex] = updatedItem;
      setCountedItems(updatedCountedItems);
    } else {
      setCountedItems([...countedItems, updatedItem]);
    }

    // Continue with existing functionality for countableItems
    const updatedCountableItems = [...countableItems];
    updatedCountableItems[currentItemIndex] = updatedItem;

    // Check if this was the last item
    if (currentItemIndex === countableItems.length - 1) {
      setCountingComplete(true);
    }
  };
  const resetCounting = () => {
    setCurrentItemIndex(0);
    setCountingComplete(false);
  };
  // Handle grid item click
  const handleGridItemClick = (item: InventoryItem) => {
    setSelectedGridItem(item);
  };

  // Handle updating a grid item
  const handleGridItemUpdate = (updatedItem: InventoryItem) => {
    // Update the items array with the updated item
    const updatedItems = items.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );
    setItems(updatedItems);

    // Now include ALL items in countedItems, not just the ones manually counted
    // For items that weren't manually counted, use their current values from the database
    const allCountedItems = updatedItems
      .filter((item) => (item["min stock amount"] || 0) > 0)
      .map((item) => {
        if (item.id === updatedItem.id) {
          // This is the item we just counted
          return updatedItem;
        }
        // Find if this item was previously manually counted
        const existingItem = countedItems.find(
          (counted) => counted.id === item.id
        );
        if (existingItem) {
          return existingItem;
        }

        // For other items, return them as is from the database
        // This ensures we have the most recent data for all items
        return item;
      });

    // Set all items as "counted" items so they appear in the receipt
    setCountedItems(allCountedItems);

    // After updating, navigate to receipt view and clear selected item
    setSelectedGridItem(null);
    setActiveTab("receipt");

    // Enable receipt tab
    setCountingComplete(true);
  };

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  //Todo:
  // Helper function to determine status color based on product group
  function getStatusColor(productGroup: string) {
    switch (productGroup) {
      case "Spejlæg":
        return "bg-yellow-400";
      case "Normal Øl":
        return "bg-green-500";
      default:
        return "bg-green-500";
    }
  }

  // Rest of your component remains the same
  return (
    <div className="flex flex-col space-y-4">
      {/* Search and filter section */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search items..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {/*<Button variant="outline" size="icon">
          <ArrowUpDown className="h-4 w-4" />
        </Button> */}
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="grid">
            <LayoutGrid className="mr-2 h-4 w-4" />
            Grid
          </TabsTrigger>
          <TabsTrigger value="count">
            <Package className="mr-2 h-4 w-4" />
            Count
          </TabsTrigger>
          <TabsTrigger value="receipt" disabled={!countingComplete}>
            <Receipt className="mr-2 h-4 w-4" />
            Receipt
          </TabsTrigger>
        </TabsList>

        {/* Grid View */}

        <TabsContent value="grid">
          {selectedGridItem ? (
            <ItemCountCard
              item={selectedGridItem}
              onUpdateItem={handleGridItemUpdate}
              mode="single"
              onClose={() => setSelectedGridItem(null)}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedItems.length > 0 ? (
                  paginatedItems.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleGridItemClick(item)}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`h-3 w-3 rounded-full ${getStatusColor(
                            item["product group"]
                          )}`}
                        ></div>
                        <h3 className="font-medium">{item.name}</h3>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <p>Location: {item.location}</p>
                        <p>Min stock: {item["min stock amount"]}</p>
                        <p>Unit: {item["quantity unit stock"]}</p>
                        <p>Group: {item["product group"]}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="col-span-full text-center py-4 text-gray-500">
                    No items found
                  </p>
                )}
              </div>
              {/* Pagination Controls */}
              {filteredItems.length > 0 && (
                <div className="flex items-center justify-center space-x-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        // Show current page, first page, last page, and pages around current
                        return (
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1
                        );
                      })
                      .map((page, i, arr) => (
                        <React.Fragment key={page}>
                          {i > 0 && arr[i - 1] !== page - 1 && (
                            <span className="px-2">...</span>
                          )}
                          <Button
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => goToPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
        {/* Count View */}
        <TabsContent value="count">
          {countingComplete ? (
            <div className="text-center space-y-4 py-6">
              <h2 className="text-xl font-medium">Counting Complete!</h2>
              <p>You've counted all items with minimum stock values.</p>
              <div className="flex justify-center gap-4">
                <Button onClick={resetCounting} variant="outline">
                  Start Over
                </Button>
                <Button onClick={() => setActiveTab("receipt")}>
                  View Receipt
                </Button>
              </div>
            </div>
          ) : countableItems.length > 0 ? (
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="relative">
                <div className="overflow-hidden h-6 text-xs flex rounded bg-gray-200">
                  <div
                    style={{
                      width: `max(${
                        ((currentItemIndex + 1) / countableItems.length) * 100
                      }%, 50px)`,
                    }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary px-2"
                  >
                    <span className="text-sm font-medium">
                      {Math.round(
                        ((currentItemIndex + 1) / countableItems.length) * 100
                      )}
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Item counting card */}
              {countableItems[currentItemIndex] && (
                <ItemCountCard
                  item={countableItems[currentItemIndex]}
                  onUpdateItem={updateItemCount}
                  onNext={goToNextItem}
                  onBack={goToPrevItem}
                  progress={{
                    current: currentItemIndex + 1,
                    total: countableItems.length,
                  }}
                />
              )}
            </div>
          ) : (
            <p className="text-center py-4 text-gray-500">No items found</p>
          )}
        </TabsContent>
        <TabsContent value="receipt">
          <ReceiptView countedItems={countedItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to determine status color based on product group
function getStatusColor(productGroup: string) {
  switch (productGroup) {
    case "Spejlæg":
      return "bg-yellow-400";
    case "Normal Øl":
      return "bg-green-500";
    default:
      return "bg-green-500";
  }
}
