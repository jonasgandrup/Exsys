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
  // Since we're now in a client component, we need to handle data fetching differently
  // You'll need to use React hooks like useEffect to fetch data
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
  const countableItems = filteredItems.filter(
    (item) => (item["min stock amount"] || 0) > 0
  );

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

  // Function to update item count
  // const updateItemCount = (updatedItem: InventoryItem) => {
  //   const newItems = [...items];
  //   const index = newItems.findIndex((item) => item.id === updatedItem.id);
  //   if (index !== -1) {
  //     newItems[index] = updatedItem;
  //     setItems(newItems);
  //   }
  // };
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
        <Button variant="outline" size="icon">
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="grid">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="grid">
            <LayoutGrid className="mr-2 h-4 w-4" />
            Grid
          </TabsTrigger>
          {/*<TabsTrigger value="list">
            <FileText className="mr-2 h-4 w-4" />
            List
          </TabsTrigger>*/}
          <TabsTrigger value="count">
            <Package className="mr-2 h-4 w-4" />
            Count
          </TabsTrigger>
          {/*<TabsTrigger value="receipt" disabled={!countingComplete}>
            <Receipt className="mr-2 h-4 w-4" />
            Receipt
          </TabsTrigger> */}
        </TabsList>

        {/* Grid View */}
        
        <TabsContent value="grid">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
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
        </TabsContent> 

        {/* List View */}
        {/*<TabsContent value="list">
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Group
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className={`h-3 w-3 rounded-full mr-2 ${getStatusColor(
                              item["product group"]
                            )}`}
                          ></div>
                          {item.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item["min stock amount"]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item["product group"]}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent> */}

        {/* Count View */}
        {/* <TabsContent value="count">
          {countableItems.length > 0 ? (
            <div className="space-y-4"> */}
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
                <Button
                  onClick={() =>
                    (
                      document.querySelector('[value="receipt"]') as HTMLElement
                    )?.click()
                  }
                >
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
