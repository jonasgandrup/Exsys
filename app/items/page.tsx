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
  Filter,
  X,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";
import ItemCountCard from "@/components/custom/itemCountCard";
import ReceiptView from "@/components/custom/recieptView";
import AddItemModal from "@/components/add-item-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  "current quantity"?: number;
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
  const [filterGroup, setFilterGroup] = useState<string | null>(null);

  // Use useEffect to fetch data when the component mounts
  React.useEffect(() => {
    async function fetchData() {
      const supabase = await createClient();
      const { data } = await supabase.from("notes").select();
      // Extract unique product groups
      if (data && data.length > 0) {
        const uniqueGroups = Array.from(
          new Set(data.map((item) => item["product group"]))
        );
        //console.log("Unique product groups:", uniqueGroups);
      }
      setItems(data || []);
    }

    fetchData();
  }, []);

  // Reset to the first page whenever the search query or filter group changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterGroup]);

  // Filter items based on search query
  const filteredItems = items
    .filter(
      (item) =>
        // Apply product group filter first if it exists
        (filterGroup === null || item["product group"] === filterGroup) &&
        // Then apply search query filter
        (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item["product group"]
            .toLowerCase()
            .includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => a.id - b.id);
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

  const updateItemCount = async (
    updatedItem: InventoryItem & { currentCount?: number }
  ) => {
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

    // Update database
    try {
      const supabase = await createClient();
      const { error } = await supabase
        .from("notes")
        .update({
          "current quantity":
            updatedItem.currentCount || updatedItem["current quantity"] || 0,
          "last quantity update": new Date().toISOString(),
        })
        .eq("id", updatedItem.id);

      if (error) {
        console.error("Error updating item in database:", error);
      }
    } catch (err) {
      console.error("Failed to update item in database:", err);
    }

    // Also update the main items array
    const updatedItems = items.map((item) => {
      if (item.id === updatedItem.id) {
        const newItem = { ...item };
        newItem["current quantity"] =
          updatedItem.currentCount || updatedItem["current quantity"] || 0;
        return newItem;
      }
      return item;
    });
    setItems(updatedItems);

    // Remove the React.useMemo hook and calculate directly
    // const uniqueProductGroups = React.useMemo(() => {
    //   return Array.from(
    //     new Set(items.map((item) => item["product group"]))
    //   ).sort();
    // }, [items]);

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
  const handleGridItemUpdate = (
    updatedItem: InventoryItem & { currentCount?: number }
  ) => {
    // Update the items array with the updated item

    const updatedItems = items.map((item) => {
      if (item.id === updatedItem.id) {
        // Make sure to update the "current quantity" property with the new value
        const newItem = { ...updatedItem };
        // Use the new current count as the current quantity
        newItem["current quantity"] =
          updatedItem.currentCount || updatedItem["current quantity"] || 0;
        return newItem;
      }
      return item;
    });

    setItems(updatedItems);

    // Now include ALL items in countedItems with proper current quantity values
    const allCountedItems = updatedItems

      .filter((item) => (item["min stock amount"] || 0) > 0)
      .map((item) => {
        // For TypeScript, create a new object with the optional currentCount property
        const countedItem = { ...item } as InventoryItem & {
          currentCount?: number;
        };

        if (item.id === updatedItem.id) {
          // This is the item we just counted
          countedItem.currentCount =
            updatedItem.currentCount || updatedItem["current quantity"] || 0;
        } else {
          // For other items, use the database value
          countedItem.currentCount = item["current quantity"] || 0;
        }

        return countedItem;
      });
    // Set all items as "counted" items so they appear in the receipt
    setCountedItems(allCountedItems);

    // After updating, navigate to receipt view and clear selected item
    setSelectedGridItem(null);
    //setActiveTab("receipt");

    // Enable receipt tab
    setCountingComplete(true);
  };

  const handleDeleteItem = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the click from opening the item
    const supabase = await createClient();
    const { error } = await supabase.from("notes").delete().eq("id", id);

    if (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item");
    } else {
      // Remove the item from the local state
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  function ProductGroupTag({ group }: { group: string }) {
    const getTagColors = (productGroup: string) => {
      switch (productGroup) {
        // Original groups
        case "Spejlæg":
          return "bg-yellow-400 text-yellow-900";
        case "Normal Øl":
          return "bg-green-500 text-green-900";

        // New groups from your list
        case "Generelle flasker":
          return "bg-blue-400 text-blue-900";
        case "Specielle flasker":
          return "bg-purple-400 text-purple-900";
        case "Postmix":
          return "bg-emerald-400 text-emerald-900";
        case "Diverse":
          return "bg-gray-400 text-gray-900";
        case "Shots":
          return "bg-red-400 text-red-900";
        case "Læsk":
          return "bg-sky-400 text-sky-900";
        case "Opblanding":
          return "bg-indigo-400 text-indigo-900";
        case "Fustager":
          return "bg-teal-400 text-teal-900";
        case "Sirup":
          return "bg-pink-400 text-pink-900";
        case "RTD":
          return "bg-orange-400 text-orange-900";
        case "Special øl":
          return "bg-lime-400 text-lime-900";
        case "Snacks":
          return "bg-rose-400 text-rose-900";

        default:
          return "bg-slate-400 text-slate-900";
      }
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${getTagColors(group)}`}
      >
        {group}
      </span>
    );
  }

  // Rest of your component remains the same
  return (
    <div className="flex flex-col space-y-4">
      {/* Search and filter section */}
      {/* <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search items..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div> */}

      {/* Group Filter Dropdown */}
      {/* <div className="relative">
          <Button
            variant="outline"
            className={`flex items-center gap-2 ${filterGroup ? "pr-8" : ""}`} // Add padding-right when filter is active
            onClick={() => document.getElementById("groupFilter")?.click()}
          >
            <Filter className="h-4 w-4" />
            {filterGroup ? (
              <span className="max-w-[150px] truncate">{filterGroup}</span> // Increased max width from 100px to 150px
            ) : (
              "Filter Group"
            )}
          </Button> */}

      {/* Move the clear button outside the parent button */}
      {/* {filterGroup && (
            <div
              className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 p-0 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300"
              style={{ marginRight: "2px" }} // Add extra margin to the right
              onClick={(e) => {
                e.stopPropagation();
                setFilterGroup(null);
              }}
            >
              <X className="h-3 w-3" />
            </div>
          )} */}

      {/* <select
            id="groupFilter"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            value={filterGroup || ""}
            onChange={(e) => setFilterGroup(e.target.value || null)}
          >
            <option value="">All Groups</option>
            {Array.from(new Set(items.map((item) => item["product group"])))
              .sort()
              .map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
          </select>
        </div>
      </div> */}

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
        {/* Only show search and filter when grid tab is active */}
        {activeTab === "grid" && (
          <div className="flex items-center space-x-2 mt-4">
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

            {/* Group Filter Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                className={`flex items-center gap-2 ${filterGroup ? "pr-8" : ""}`}
                onClick={() => document.getElementById("groupFilter")?.click()}
              >
                <Filter className="h-4 w-4" />
                {filterGroup ? (
                  <span className="max-w-[150px] truncate">{filterGroup}</span>
                ) : (
                  "Filter Group"
                )}
              </Button>

              {filterGroup && (
                <div
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 p-0 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300"
                  style={{ marginRight: "2px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterGroup(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </div>
              )}

              <select
                id="groupFilter"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={filterGroup || ""}
                onChange={(e) => setFilterGroup(e.target.value || null)}
              >
                <option value="">All Groups</option>
                {Array.from(new Set(items.map((item) => item["product group"])))
                  .sort()
                  .map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
              </select>
            </div>
            <AddItemModal />
          </div>
        )}

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
                      className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
                      onClick={() => handleGridItemClick(item)}
                    >
                      <div className="flex flex-col space-y-2">
                        <div className="flex justify-between items-start">
                          <ProductGroupTag group={item["product group"]} />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-transparent absolute top-2 right-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{item.name}"?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => handleDeleteItem(item.id, e)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <h3 className="font-medium">{item.name}</h3>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <p>
                          Current stock: {item["current quantity"] ?? "N/A"}
                        </p>
                        <p>Location: {item.location}</p>
                        <p>Min stock: {item["min stock amount"]}</p>
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
                  item={{
                    ...countableItems[currentItemIndex],
                    // Ensure the component always gets the most current count from our state
                    currentCount:
                      countableItems[currentItemIndex]["current quantity"] || 0,
                  }}
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
